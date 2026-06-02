# Chat Agent — Harness Audit

Review date: 2026-06-02. Branch: `main`.

Focus: how *brilliant* and *autonomous* the chat agent is, measured against
current harness-engineering practice. This is a **diagnosis** — flaws ranked by
severity. Remediation lives in [`../plans/chat-agent-harness-upgrade.md`](../plans/chat-agent-harness-upgrade.md).

## Sources studied

- [Anthropic — Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- [Anthropic — Harness design for long-running apps](https://www.anthropic.com/engineering/harness-design-long-running-apps)
- [OpenAI — Harness engineering](https://openai.com/index/harness-engineering/) (403 direct; read via [InfoQ summary](https://www.infoq.com/news/2026/02/openai-harness-engineering-codex/))

### Distilled principles (the bar we measure against)

1. **Persistent memory is filesystem/DB-backed, not conversation history.** Anything not in durable context "doesn't exist" to the agent.
2. **Separate the doer from the judge.** Generators self-praise; an independent evaluator catches mediocre output.
3. **Enforce invariants in control flow, not prose.** A prompt rule cannot stop a model from giving up; a middleware can.
4. **Manage context** via compaction or clean resets — models wrap up early ("context anxiety") as the window fills.
5. **Structured execution** — research → plan → execute → verify as real phases, not a vibe in the system prompt.
6. **Tools give actionable feedback** — distinguish "not found" from "no match"; shape tools so the *mandated* behaviour is the *easy* path.
7. **Progressive disclosure of context** — don't load the whole instruction manual every turn.

---

## Current architecture (as built)

- **Entry**: `backend/app/api/chat.py` — one module-level `_agent`, cloned per request, AG-UI `StreamingResponse`.
- **Agent**: `backend/app/agents/chat/agent.py` — `create_deep_agent` (deepagents), `subagents=[]`.
- **Model**: `gpt-5.4-mini-2026-03-17` @ **temperature 0.7** (`app/utils/model_provider.py`).
- **Memory**: 2 static files (`AGENTS.md`, `openui_system_prompt.md`) via `FilesystemBackend(virtual_mode=True)`; filesystem write tools excluded.
- **Checkpointer**: `MemorySaver` (in-process RAM).
- **Middleware**: `conflict_guard` (after_model) → `ToolCallLimitMiddleware(run_limit=20, exit_behavior="continue")` → `ModelRetryMiddleware(max_retries=3, backoff_factor=2.0)`.
- **Tools** (7): `list_docs`, `search_documents`, `get_wiki_page`, `search_chunks`, `vector_search`, `check_conflicts`, `resolve_conflict` (HITL `interrupt`).
- **Output**: openui-lang DSL only.
- **Thread**: frontend `TwoPanelShell.tsx:93` sets `threadId = ${user.id}-${Date.now()}` on every mount.

---

## 🔴 Critical

### C1 — No durable memory

`MemorySaver` is an in-process dict. Process restart → every thread lost. Worse,
the frontend mints a fresh `threadId` (`...-${Date.now()}`) on **every mount**,
so each page load is a brand-new thread even while the process is alive. The
agent's only memory is the current request's message list.

- **Violates**: principle 1 (filesystem/DB-backed persistence).
- **Impact**: permanently amnesiac; no follow-ups across sessions; no learning.
- **Refs**: `agent.py:26` (`_checkpointer = MemorySaver()`), `frontend/components/TwoPanelShell.tsx:93`.

### C2 — No context management

No `SummarizationMiddleware` on the chat agent (it was added to the *conflict
resolver*, not here). Messages grow unbounded → eventual token overflow and
"context anxiety" (model wraps up early as the window fills).

- **Violates**: principle 4.
- **Impact**: long chats degrade then break.
- **Refs**: `agent.py:44-52` (middleware list — no summarization/compaction).

### C3 — temperature 0.7 on a grounded, structured-output agent

The agent must (a) never hallucinate and (b) emit valid openui-lang with **exact
UUID citations**. 0.7 raises both ungrounded claims and malformed DSL. Temp was
set explicitly on the conflict resolver but left hot here.

- **Impact**: ungrounded answers, broken DSL, dead citation cards.
- **Fix surface**: `model_provider.py` / `agent.py:31` (`get_llm(temperature=0.7)`).

---

## 🟠 High — autonomy & verification

### H1 — Doer is also judge

Retrieve → synthesize → emit in one pass; the model grades its own relevance in
prose. No second pass asks "is this grounded / cited / complete?"

- **Violates**: principle 2 — the strongest lever in both Anthropic and OpenAI writeups.

### H2 — Quality gates are prose, not code

`AGENTS.md` demands relevance ≥ 0.6, ≥ 2 sources, every claim → a chunk. **None
enforced.** `vector_search` returns `relevance_score`; nothing filters < 0.6. By
contrast `conflict_guard` *does* enforce its one rule in control flow — the right
pattern, applied to exactly one invariant.

- **Violates**: principle 3.
- **Refs**: `AGENTS.md` Layer 3 "Quality Gate"; `retrieval.py:191-233` (no filtering).

### H3 — No citation / grounding verification

Spec requires citing exact UUIDs from tool results. Nothing checks that emitted
citation IDs ∈ retrieved IDs → hallucinated UUIDs silently produce dead cards.

### H4 — The ReAct loop is imaginary

"Execute this loop internally" is entirely prompt-described. A mini model may not
reliably plan, diversify the 2–3 queries, or honor retry rounds. No real
plan phase.

- **Violates**: principle 5.

---

## 🟡 Medium — tool design

### M1 — Tools conflate "not found" with "no match"

`get_wiki_page` returns `{}`, `search_chunks` returns `[]` for both a wrong/owned
doc id and a genuine empty result. The model can't pick the right recovery.

- **Violates**: principle 6.
- **Refs**: `retrieval.py:139`, `retrieval.py:171-172`.

### M2 — Conflict drill is N separate calls — the recurring failure

`AGENTS.md` Layer 5 spends ~30 lines begging the model to `search_chunks` *every*
doc in a conflict, and `conflict_guard` exists solely to catch when it doesn't.
Root cause is tool shape: one-doc-per-call. A `drill_conflict(conflict_id)` that
returns chunks for *all* docs at once makes the mandated behaviour atomic.

- **Violates**: principle 6 (make the required path the easy path).
- **Refs**: `AGENTS.md:113-161`, `middleware.py` (whole file), `hitl.py:54-62`.

### M3 — Query diversity + thresholding is manual

Prompt asks for 2–3 phrasings; the model must dedup/merge by hand and nothing
filters < 0.6. Push fusion server-side (`queries: list[str]` → merge + dedup +
threshold).

- **Refs**: `AGENTS.md:57-63`, `retrieval.py:191`.

### M4 — No conflict-overview tool

`check_conflicts` needs a `document_id` you must already know. No "list my active
conflicts." Detection hinges on the model noticing `has_conflict` in list/search
output — easy to skip.

### M5 — No output-size budget

`vector_search` `limit` up to 20 × arbitrary-length chunks can blow context in one
call. "Max 8 chunks" is prose-only.

- **Refs**: `retrieval.py:212`, `AGENTS.md:93`.

---

## 🟡 Medium — ops & reliability

### O1 — `ToolCallLimit(exit_behavior="continue")`

After 20 calls the model keeps going *without tools* → can emit a final answer on
incomplete evidence. Combined with H2 (no grounding gate) → confidently wrong with
too few sources.

- **Refs**: `agent.py:49`.

### O2 — No malformed-DSL repair

Invalid openui-lang breaks the frontend; nothing validates/repairs server-side. A
validate → repair loop hardens it.

### O3 — Global in-RAM checkpointer never evicts

Slow memory growth over uptime; only isolation is the `user_id`-prefixed
`thread_id`.

- **Refs**: `agent.py:26`, `api/chat.py:21-28`.

---

## Severity summary

| ID | Flaw | Severity | Principle |
|----|------|----------|-----------|
| C1 | No durable memory | 🔴 | 1 |
| C2 | No context management | 🔴 | 4 |
| C3 | temp 0.7 on grounded agent | 🔴 | — |
| H1 | Doer = judge | 🟠 | 2 |
| H2 | Quality gates are prose | 🟠 | 3 |
| H3 | No citation/grounding check | 🟠 | 3 |
| H4 | ReAct loop imaginary | 🟠 | 5 |
| M1 | Tools conflate not-found / no-match | 🟡 | 6 |
| M2 | Conflict drill is N calls | 🟡 | 6 |
| M3 | Manual query fusion | 🟡 | 6 |
| M4 | No conflict-overview tool | 🟡 | 6 |
| M5 | No output-size budget | 🟡 | 6 |
| O1 | ToolLimit continue → thin answers | 🟡 | 3 |
| O2 | No DSL repair | 🟡 | — |
| O3 | Checkpointer never evicts | 🟡 | 1 |
