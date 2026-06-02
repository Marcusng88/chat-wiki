# Chat Agent — Harness Upgrade Plan

Plan date: 2026-06-02. Branch: `main`.

Remediation for the flaws in [`../design/chat-agent-harness-audit.md`](../design/chat-agent-harness-audit.md).
Goal: make the chat agent more **grounded** (stops hallucinating), **durable**
(remembers), and **autonomous** (verifies its own work) — without a rewrite.

Ordered by leverage: each phase is shippable on its own and unlocks the next.

---

## Phase 0 — One-liners (do first, near-zero risk)

### 0.1 Cool the model — fixes C3

`get_llm(temperature=0.7)` → `temperature=0.2` for the chat agent. Grounded
retrieval + valid DSL want low temp.

- **File**: `app/agents/chat/agent.py:31`.
- **Verify**: emitted openui-lang parses; answers stop drifting from chunks.

### 0.2 Stop minting a new thread every mount — half of C1

Frontend regenerates `threadId = ${user.id}-${Date.now()}` on every mount, so
even a durable checkpointer would never be reused. Persist one stable id per user
(e.g. `localStorage 'cw:thread-id'`, or `${user.id}-main`).

- **File**: `frontend/components/TwoPanelShell.tsx:93`.
- **Verify**: reload page mid-chat → same `thread_id` sent.

---

## Phase 1 — Durable state — fixes C1, O3

Swap `MemorySaver` for a persistent LangGraph checkpointer (Postgres is already in
the stack — reuse `app/db`). The agent then survives restarts and the stable
thread from 0.2 becomes real continuity.

- **Files**: `app/agents/chat/agent.py:26,53` (checkpointer), new `app/db` wiring.
- **Watch**: `interrupt()` HITL state must round-trip through the persistent saver
  (conflict cards resume after restart).
- **Verify**: start chat → restart backend → continue same thread → history intact;
  open conflict card survives restart.

---

## Phase 2 — Context management — fixes C2

Add compaction so long chats don't overflow. Two options:

1. **`SummarizationMiddleware`** (same one already on the conflict resolver) — keep
   recent turns verbatim, summarize older ones. Lowest effort, reuses a known-good
   pattern.
2. **Structured reset** — on a token threshold, write a handoff summary to durable
   state and start a fresh window. Heavier; defer unless (1) proves lossy.

Start with (1).

- **File**: `app/agents/chat/agent.py:44-52` (add to middleware list).
- **Verify**: drive a 50+ turn chat → no token-limit error; agent still cites docs
  from early turns via the summary.

---

## Phase 3 — Enforce grounding in code — fixes H2, H3, O1

The prose quality gate becomes a middleware, mirroring `conflict_guard`'s pattern.

### 3.1 Relevance + min-source gate
Before a final answer, scan this turn's tool results. If a multi-fact synthesis
rests on < 2 chunks with `relevance_score ≥ 0.6`, bounce the model back (bounded
nudge counter, same shape as `conflict_guard`).

### 3.2 Citation-ID validation
Collect retrieved doc/chunk UUIDs this turn. Parse the emitted openui-lang for
`CitationCard` / `__cite__` IDs. Any cited ID ∉ retrieved set → bounce with a
corrective ("you cited an id that was never retrieved").

- **New file**: `app/agents/chat/middleware.py` (extend) — `grounding_guard`.
- **Note**: tighten or drop `ToolCallLimit(exit_behavior="continue")` (O1) so the
  model can't answer thin after hitting the cap.
- **Verify**: feed a query with no good matches → agent emits `KnowledgeGapCard`,
  not a fabricated answer; inject a fake UUID in a test → guard bounces.

---

## Phase 4 — Better tools — fixes M1–M5

Make the mandated behaviour the easy path; shrink `AGENTS.md` accordingly.

| Change | Fixes | Surface |
|--------|-------|---------|
| Return explicit status (`not_found` vs `empty`) | M1 | `retrieval.py:139,171` |
| `drill_conflict(conflict_id)` → chunks for **all** docs at once | M2 | new tool in `tools/` |
| `vector_search(queries: list[str])` → merge + dedup + filter ≥ 0.6 server-side | M3 | `retrieval.py:191` |
| `list_conflicts()` → all active conflicts for the user | M4 | new tool |
| Cap returned chunk count/length server-side | M5 | `retrieval.py:212` |

`drill_conflict` (M2) is the high-value one: it can retire most of `AGENTS.md`
Layer 5 *and* the `conflict_guard` middleware, because the failure it polices
(forgetting to drill a doc) becomes structurally impossible.

- **Verify**: conflict flow completes without any `conflict_guard` nudge firing.

---

## Phase 5 — Doer ≠ judge — fixes H1, H4 (the autonomy jump)

The biggest "brilliant" lever, but most invasive — land Phases 0–4 first.

### Option A — Evaluator pass (lighter)
After synthesis, a separate low-temp evaluator call grades the draft against the
retrieved evidence (grounded? cited? answers the question?). Below bar → one
revise loop. This is principle 2 with minimal restructure.

### Option B — Plan → execute → verify phases (heavier)
Make the ReAct loop real: an explicit planning step emits a retrieval plan, the
execute step runs it, the verify step is Option A. Closer to OpenAI's structured
execution; revisit only if Option A's single pass is insufficient.

Start with A.

- **Verify**: on an ambiguous query, evaluator catches an ungrounded draft and the
  revised answer cites real chunks.

### Phase 5b — openui-lang repair — fixes O2
Validate emitted DSL server-side; on parse failure, one repair pass before
streaming. Cheap insurance once an evaluator hook exists.

---

## Sequencing

```
Phase 0  (1 line each)      → ship same day
Phase 1  (durable state)    → unlocks real memory + HITL persistence
Phase 2  (compaction)       → survive long chats
Phase 3  (grounding guard)  → stop hallucinating, in code
Phase 4  (tools)            → reliability + shrink AGENTS.md + maybe delete conflict_guard
Phase 5  (evaluator)        → the autonomy/brilliance jump
```

Phases 0–3 are the grounding/durability core. Phase 4 pays down the conflict
debt. Phase 5 is where the agent starts judging its own work — do it last, on a
foundation that already remembers and stays grounded.
