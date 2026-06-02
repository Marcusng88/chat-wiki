# Chat Agent — Middleware, Hooks & AGENTS.md Combine Doctrine

Companion to [`chat-agent-harness-audit.md`](./chat-agent-harness-audit.md) and
[`../plans/chat-agent-harness-upgrade.md`](../plans/chat-agent-harness-upgrade.md).
Date: 2026-06-02. Branch: `main`.

This doc answers one question: **given LangChain middleware, where does each rule
belong — the system prompt, a tool, or a hook — and what do the missing pieces
look like in code?** Skeletons below are drafts to adapt, not finished modules.

---

## 1. The three-layer doctrine

LangChain gives three places to put behavior. They are not interchangeable.

```
AGENTS.md   = INTENT       soft · persuades · needs judgment    (taste, strategy, output style)
middleware  = INVARIANT    hard · guarantees · deterministic    (must-be-true regardless of model)
tools       = CAPABILITY   what's possible + its shape          (make the right path the easy path)
```

**Rule of thumb:** *Prose persuades, code enforces, tools constrain.*

The failure mode the audit keeps finding (H2, H3, M1, M2): rules that **must never
break** are written as prose in `AGENTS.md`. Prose cannot guarantee anything — a
mini model skims it. Any sentence containing **"never / always / must"** is a lie
until a hook or a tool shape makes it structurally true.

| If the rule… | …it belongs in |
|---|---|
| needs taste / judgment / can degrade gracefully | `AGENTS.md` |
| must hold every time, no exceptions | middleware (`after_model` / `wrap_tool_call`) |
| is "always do X before Y" | tool **shape** — fuse X+Y into one call |
| is situational (only when state Z) | `wrap_model_call` injects it on demand |

---

## 2. Hook reference (the 6 entry points)

Node hooks run at a point; wrap hooks run *around* a call and control the handler.

| Hook | Style | Fires | This agent's use |
|---|---|---|---|
| `before_agent` | node | once, start | load durable memory → inject |
| `before_model` | node | before each LLM call | context budget; `can_jump_to=["end"]` |
| `wrap_model_call` | wrap | around each LLM call | **dynamic system prompt**, model routing, retry/cache |
| `after_model` | node | after each LLM response | output guardrails (`conflict_guard` lives here) |
| `wrap_tool_call` | wrap | around each tool call | shape/cap tool results, inject status |
| `after_agent` | node | once, end | persist memory, cleanup |

Node hook returns `{"jump_to": "..."}` (declared via `@hook_config(can_jump_to=[...])`)
to short-circuit, or a state dict to merge. `wrap_model_call` calls `handler` 0×
(short-circuit), 1× (normal), or N× (retry).

Middleware list order matters: `after_model` hooks run in list order; the first
one to return `jump_to` wins that round. `conflict_guard` is first by design so
it sees the model's final output before any later guard mutates it.

---

## 3. What to fix — SYSTEM PROMPT (`AGENTS.md`)

Today: ~500 lines, fully resident every model call. Problems and fixes:

| Problem | Audit ref | Fix |
|---|---|---|
| Quality Gate as prose: "relevance ≥ 0.6, ≥ 2 sources" (lines 33, 66, 75–79) | H2 | **Delete the enforcement claim.** Keep a one-line intent ("answer only from retrieved evidence"); the guarantee moves to `grounding_guard` (§6.1). |
| "Cite exact UUIDs" with no check | H3 | Same — describe intent, enforce in `grounding_guard`. |
| Layer 5 conflict protocol (~lines 109–164, the 30-line drill plea + worked example) resident every turn | M2, principle 7 | **Move behind `wrap_model_call` (§6.2).** Inject only when an open conflict is in state. Saves tokens on every non-conflict turn and sharpens focus. |
| ReAct loop "execute internally" (Layer 2) is a vibe | H4 | Either accept it as soft strategy, or back it with `TodoListMiddleware` so the plan is a tracked `write_todos` artifact, not prose. |
| Tool catalog (Layer 4) duplicates tool docstrings | DRY | Trim to a one-line "when to reach for which tool"; the schemas the model already sees are the source of truth. |
| Output rendering decision tree (Layer 6) — long but genuinely judgment | — | **Keep.** This is taste; it belongs in the prompt. |

Target shape after trim: **identity → tool-selection strategy → output contract →
escalation.** Lean, stable, resident. Everything situational or enforceable leaves.

> Litmus test per line: *"Would the agent be wrong if it ignored this?"* If yes →
> it's an invariant, move to code. If "it'd just be less elegant" → keep in prompt.

---

## 4. What to fix — TOOLS (`tools/retrieval.py`)

Make the mandated behavior the *easy* path so the prompt can stop begging.

| # | Change | Audit | Surface |
|---|---|---|---|
| T1 | Distinguish `not_found` from `no_match` in return value | M1 | `get_wiki_page:139`, `search_chunks:171` |
| T2 | `vector_search(queries: list[str])` → embed all, merge, dedup, filter `≥ 0.6` server-side | M3, H2 | `vector_search:191` |
| T3 | Cap chunk count *and* per-chunk length server-side | M5 | `vector_search:212`, `search_chunks:163` |
| T4 | New `drill_conflict(conflict_id)` → chunks for **every** doc in the conflict, one call | M2 | new tool |
| T5 | New `list_conflicts()` → all active conflicts for the user | M4 | new tool |

T4 is the highest leverage: it makes "drill every document" atomic, which can
**retire most of Layer 5 and possibly `conflict_guard` itself** — the failure the
guard polices (forgetting a doc) becomes impossible.

---

## 5. What to fix — MIDDLEWARE (`agent.py`, `middleware.py`)

Current chain: `conflict_guard` → `ToolCallLimit(15, continue)` → `ModelRetry` →
`SummarizationMiddleware`.

| # | Change | Audit | Where |
|---|---|---|---|
| MW1 | Add `grounding_guard` (`after_model`): min-source + citation-ID validation | H2, H3 | `middleware.py` (new), `agent.py` list |
| MW2 | Add dynamic-prompt `wrap_model_call`: inject conflict layer on demand | principle 7 | `middleware.py` (new) |
| MW3 | Reconsider `ToolCallLimit(exit_behavior="continue")` → after cap the model answers tool-less on thin evidence; `grounding_guard` now backstops it, or switch to `"error"` | O1 | `agent.py:53` |
| MW4 | Optional `ToolRetryMiddleware` — DB/vector calls have no retry today | reliability | `agent.py` list |
| MW5 | Optional DSL validate→repair in `after_model` before stream | O2 | `middleware.py` |

Ordering after changes:
```
wrap_model_call (dynamic prompt)   # shapes the request
conflict_guard (after_model)       # existing invariant, runs first among after_model
grounding_guard (after_model)      # new invariant
ToolCallLimit → ModelRetry → ToolRetry → Summarization
```

---

## 6. Skeletons

### 6.1 `grounding_guard` — enforce citations in code (MW1, fixes H2/H3)

Mirrors `conflict_guard`'s shape: scan this run's messages, bounce the model with
a corrective if the final answer cites evidence it never retrieved.

```python
# middleware.py  (append)
"""Grounding guard: a final answer may only cite doc/chunk IDs that were actually
retrieved this run, and a multi-fact synthesis needs a floor of real evidence.
Prose in AGENTS.md asked for this; only control flow can guarantee it."""

import re
from typing import Any

from langchain.agents.middleware import after_model, AgentState
from langchain_core.messages import AIMessage, SystemMessage, ToolMessage
from langgraph.runtime import Runtime
from typing_extensions import NotRequired

_MIN_SOURCES = 2          # floor for a multi-fact answer
_MIN_RELEVANCE = 0.6
_MAX_GROUNDING_NUDGES = 2

# Tool results that carry retrievable IDs. Adapt names to your tools.
_ID_BEARING_TOOLS = {"vector_search", "search_chunks", "get_wiki_page",
                     "search_documents", "list_docs"}

# How a citation appears in emitted openui-lang. ADAPT to the real DSL token —
# e.g. CitationCard(docId="...") or a __cite__:<uuid> marker. This regex is a
# placeholder for the actual citation syntax in AGENTS.md Layer 6 "Citations".
_CITED_ID_RE = re.compile(r'(?:docId|doc_id|citationId)\s*=\s*"([0-9a-f\-]{8,})"')


class GroundingState(AgentState):
    grounding_nudges: NotRequired[int]


def _retrieved_ids(messages: list) -> set[str]:
    """Every doc/chunk id the tools actually returned this run."""
    ids: set[str] = set()
    for m in messages:
        if isinstance(m, ToolMessage) and m.name in _ID_BEARING_TOOLS:
            ids.update(re.findall(r'[0-9a-f]{8}-[0-9a-f\-]{27}', str(m.content)))
    return ids


def _grounded_source_count(messages: list) -> int:
    """Count distinct docs returned at or above the relevance floor."""
    docs: set[str] = set()
    for m in messages:
        if isinstance(m, ToolMessage) and m.name == "vector_search":
            for doc_id, score in re.findall(
                r"'doc_id':\s*'([0-9a-f\-]+)'.*?'relevance_score':\s*([0-9.]+)",
                str(m.content),
            ):
                if float(score) >= _MIN_RELEVANCE:
                    docs.add(doc_id)
    return len(docs)


@after_model(state_schema=GroundingState, can_jump_to=["model"])
def grounding_guard(state: GroundingState, runtime: Runtime) -> dict[str, Any] | None:
    messages = state["messages"]
    if not messages:
        return None
    last = messages[-1]
    if not isinstance(last, AIMessage) or last.tool_calls:
        return None  # still working

    nudges = state.get("grounding_nudges", 0)
    if nudges >= _MAX_GROUNDING_NUDGES:
        return None  # yield, don't loop forever

    retrieved = _retrieved_ids(messages)
    cited = set(_CITED_ID_RE.findall(str(last.content)))

    hallucinated = cited - retrieved
    too_thin = _grounded_source_count(messages) < _MIN_SOURCES and len(cited) > 1

    if not hallucinated and not too_thin:
        return None

    if hallucinated:
        corrective = (
            f"STOP. You cited id(s) {sorted(hallucinated)} that were never returned "
            "by a retrieval tool this turn. Remove fabricated citations or retrieve "
            "the evidence first. Cite only ids present in tool results."
        )
    else:
        corrective = (
            f"STOP. This answer rests on fewer than {_MIN_SOURCES} sources at "
            f"relevance ≥ {_MIN_RELEVANCE}. Retrieve more evidence or emit a "
            "KnowledgeGapCard instead of a confident answer."
        )

    return {
        "jump_to": "model",
        "grounding_nudges": nudges + 1,
        "messages": [SystemMessage(content=corrective)],
    }
```

> The two regexes are placeholders. Wire them to the real citation token and the
> actual JSON/dict shape your tools serialize. Better: have the tools return a
> stable machine-readable envelope (§6.3) so the guard parses structure, not prose.

### 6.2 Dynamic system prompt — progressive disclosure (MW2, fixes principle 7)

Keep `AGENTS.md` lean; load the conflict protocol only when a conflict is live.

```python
# middleware.py  (append)
from pathlib import Path
from typing import Callable

from langchain.agents.middleware import wrap_model_call, ModelRequest, ModelResponse
from langchain_core.messages import ToolMessage

_CONFLICT_LAYER = (Path(__file__).parent / "fragments" / "conflict_layer.md").read_text()


def _conflict_is_live(messages: list) -> bool:
    for m in messages:
        if isinstance(m, ToolMessage) and m.name == "check_conflicts":
            c = (m.content or "")
            if isinstance(c, str) and c.strip() not in ("", "[]"):
                return True
    return False


@wrap_model_call
def progressive_prompt(
    request: ModelRequest,
    handler: Callable[[ModelRequest], ModelResponse],
) -> ModelResponse:
    if _conflict_is_live(request.state["messages"]):
        request = request.override(
            system_prompt=request.system_prompt + "\n\n" + _CONFLICT_LAYER
        )
    return handler(request)
```

Move Layer 5 out of `AGENTS.md` into `fragments/conflict_layer.md`. Net: ~50 lines
leave the every-turn budget and only appear when relevant. Same pattern can inject
a "you hit the tool cap, wrap up with what you have" note when `ToolCallLimit` fires.

### 6.3 Tool fixes — explicit status + server-side fusion (T1, T2, T3)

```python
# retrieval.py — T1: get_wiki_page returns a status, not a bare {}
return {"status": "ok", **dict(row)} if row else {"status": "not_found"}

# retrieval.py — T1: search_chunks distinguishes the two empties
#   ... after the ownership check:
if not await cur.fetchone():
    return {"status": "doc_not_found", "chunks": []}
#   ... after the vector query:
rows = [dict(r) for r in await cur.fetchall()]
return {"status": "ok" if rows else "no_match", "chunks": rows}
```

```python
# retrieval.py — T2 + T3: multi-query fusion, threshold, and caps server-side
_MAX_CHUNKS = 8
_MAX_CHARS = 1200

@tool(parse_docstring=True)
async def vector_search(
    queries: list[str],
    config: RunnableConfig = None,
) -> dict:
    """Search all ready documents for several phrasings at once.

    Pass 2–3 diverse phrasings of the user's need. Results are merged, de-duped,
    filtered to relevance ≥ 0.6, and capped. You no longer dedup or threshold by
    hand — the tool guarantees it.

    Args:
        queries: 2–3 natural-language phrasings of the information need.

    Returns:
        Dict with 'status' ('ok' | 'no_match') and 'chunks'
        (content, relevance_score, doc_title, doc_id), best-first, max 8.
    """
    user_id = config["configurable"]["user_id"]
    seen: dict[tuple, dict] = {}
    for q in queries[:3]:
        vector = await get_embeddings().aembed_query(q)
        async with get_conn() as conn:
            async with conn.cursor(row_factory=dict_row) as cur:
                await cur.execute(
                    """
                    SELECT c.content, c.chunk_index,
                           d.id::text AS doc_id, d.title AS doc_title,
                           1 - (c.embedding <=> %s::vector) AS relevance_score
                    FROM chunks c JOIN documents d ON d.id = c.document_id
                    WHERE d.user_id = %s AND d.status = 'ready'
                    ORDER BY c.embedding <=> %s::vector
                    LIMIT 12
                    """,
                    (str(vector), user_id, str(vector)),
                )
                for r in await cur.fetchall():
                    if r["relevance_score"] < 0.6:
                        continue
                    key = (r["doc_id"], r["chunk_index"])
                    if key not in seen or r["relevance_score"] > seen[key]["relevance_score"]:
                        row = dict(r)
                        row["content"] = row["content"][:_MAX_CHARS]
                        seen[key] = row

    chunks = sorted(seen.values(), key=lambda x: -x["relevance_score"])[:_MAX_CHUNKS]
    return {"status": "ok" if chunks else "no_match", "chunks": chunks}
```

> Changing the return *type* (list → dict) ripples to `AGENTS.md` Layer 4 and the
> `grounding_guard` parser — change all three together, then drop the prompt's
> "use 2–3 phrasings / dedup / filter < 0.6" lines since the tool now owns them.

### 6.4 `drill_conflict` — make the mandated path atomic (T4, fixes M2)

```python
# tools/conflict.py  (new)
@tool(parse_docstring=True)
async def drill_conflict(conflict_id: str, config: RunnableConfig = None) -> dict:
    """Fetch the evidence chunks for EVERY document in a conflict, in one call.

    Use this the moment check_conflicts surfaces a conflict. It returns the top
    chunks per involved document so you can form a stance for each — no need to
    call search_chunks per document.

    Args:
        conflict_id: UUID of the conflict to drill.

    Returns:
        Dict with 'documents': list of {doc_id, title, chunks:[...]}, one entry
        per document in the conflict.
    """
    user_id = config["configurable"]["user_id"]
    # 1. load the conflict's document ids (ownership-checked)
    # 2. for each doc, top-k chunks around the conflict topic
    # 3. return them grouped by document
    ...
```

With T4 landed, the failure `conflict_guard` exists to catch (answering before
drilling every doc) is structurally impossible — Layer 5's worked example and the
guard's nudge loop can both shrink or retire.

---

## 7. Sequencing (folds into the upgrade plan)

```
Phase 2  ✅ SummarizationMiddleware            (done — context management)
Phase 3a    grounding_guard  (§6.1)            ← MW1, biggest grounding win
Phase 3b    progressive_prompt (§6.2)          ← MW2, trims every-turn tokens
Phase 4a    tool status + fusion (§6.3)        ← T1–T3, lets AGENTS.md shrink
Phase 4b    drill_conflict + list_conflicts    ← T4–T5, may retire conflict_guard
Phase 0     AGENTS.md trim                      ← do alongside each tool/guard landing
```

Each guard/tool that lands lets a slice of `AGENTS.md` get deleted. The prompt
should *shrink* as the harness grows — that's the doctrine working: intent in
prose, guarantees in code, capability in tools.
```
