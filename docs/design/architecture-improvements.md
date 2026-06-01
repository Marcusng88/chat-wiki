# Architecture Improvements — Deepening Opportunities

Review date: 2026-06-01. Branch: `feature/conflict-resolver`.

Focus: testability + future maintainability. Each item turns a shallow or
tangled module into a **deep** one with a real test **seam**. Vocabulary:

- **Module** — interface + implementation.
- **Interface** — everything a caller must know (types, invariants, errors, ordering).
- **Deep** — lots of behaviour behind a small interface. **Shallow** — interface as complex as the impl.
- **Seam** — where behaviour can be swapped without editing in place.
- **Deletion test** — delete the module; if complexity reappears across N callers, it earned its keep.

No `CONTEXT.md` or ADRs exist in the repo yet. Nothing here re-litigates a recorded decision.

---

## Backend

### 1. Chunk-repository seam — SQL out of `@tool` functions

**Files**

- `backend/app/agents/chat/tools/retrieval.py:46-234`
- `backend/app/agents/docs_ingestion/tools/chunking.py:86-98`
- `backend/app/agents/docs_ingestion/tools/index.py:31-42`
- `backend/app/agents/docs_ingestion/tools/status.py:38-43`
- `backend/app/agents/docs_ingestion/tools/wiki.py:72-78`
- Already-centralized: `backend/app/db/conflicts.py`, `backend/app/db/documents.py`

**Problem**

14 raw SQL queries live inside agent tools; 19 sit behind `app/db/`. Two seams
for one concept. `vector_search()` (`retrieval.py:191`) reimplements the
chunk+document join `fetch_conflict_candidates()` (`conflicts.py:25`) already
owns. `_HAS_CONFLICT_SUBQUERY` copy-pasted in `retrieval.py:9` and
`documents.py:57`. `ORDER BY {order}` f-string at `retrieval.py:58` (whitelisted,
but still raw). Any tool needs a live DB to exercise.

**Solution**

Push every chunk/document query behind `app/db/` repository functions. Tools
become thin domain callers. SQL knowledge concentrates in one layer.

**Benefit**

- Locality: schema change touches one file, not seven.
- Leverage: dedup the conflict subquery + the vector join (one definition).
- Tests: repository functions testable directly; tools no longer need a DB.

---

### 2. Split pure logic from I/O in `chunk_and_embed`

**Files**

- `backend/app/agents/docs_ingestion/tools/chunking.py:42-105`

**Problem**

Splitting (pure) + embedding (I/O) + DELETE/INSERT loop (I/O) welded in one
`@tool`. `derive_page_refs` (`chunking.py:20`) already extracted + tested — proof
the pattern works, but the rest stays untestable. INSERT loop does N round-trips,
no `executemany`.

**Solution**

Extract a pure "build chunk records" step (chunks + vectors + page_refs → rows)
from the persistence step. Persist via a batch insert helper.

**Benefit**

- Tests: pure record-building tested with zero mocks.
- Locality: chunk-row shape lives in one named function.
- Persistence becomes a reusable batch insert.

---

### 3. Agent-builder seam — kill 3× wiring boilerplate

**Files**

- `backend/app/agents/chat/agent.py:27`
- `backend/app/agents/docs_ingestion/agent.py:16`
- `backend/app/agents/conflict_resolver/agent.py:18`
- Consumers: `backend/app/api/chat.py:12`, `backend/app/services/ingestion.py:27`, `backend/app/services/resolution.py:13`

**Problem**

`create_deep_agent(...)` hand-assembled 3 times, drifting:

| Agent | Instantiation | Checkpointer | Middleware |
|---|---|---|---|
| chat | singleton at import | MemorySaver (global) | ModelRetry only |
| ingestion | rebuilt per call | none | ToolRetry + ModelRetry |
| resolver | rebuilt per call | none | ModelRetry only |

Config (`recursion_limit`, `user_id`, temperature) scattered across agent.py +
services + api. No seam to inject a fake agent → zero agent/endpoint tests.

**Solution**

One builder taking per-agent differences (tools, middleware, checkpointer) as
explicit params. Services/API receive an agent rather than constructing one.

**Benefit**

- Leverage: new agent = one call.
- Locality: middleware + recursion policy in one place.
- Tests: inject stub agent; test endpoints + services without a real LLM.

---

### 4. Streaming + background-task error boundary

**Files**

- `backend/app/api/chat.py:24-36` — SSE generator, no try/except
- `backend/app/api/documents.py:64-67` — `except Exception: pass` on storage delete
- `backend/app/api/documents.py:44`, `backend/app/api/resolve.py` — silent `background_tasks`

**Problem**

Failures vanish. Storage-delete swallow orphans chunks/embeddings/conflicts.
Background ingestion/resolver errors never surface. SSE mid-stream failure → client
gets partial output.

**Solution**

Wrap the work behind a small "run-and-report status" module recording terminal
state to `documents` / conflict status. Add an error boundary around the SSE
generator.

**Benefit**

- Failures observable + assertable in tests.
- Frontend Realtime already watches that status — no new transport needed.

---

## Frontend

### 5. Extract SSE-event → action as a pure module

**Files**

- `frontend/lib/hooks/useChat.ts:13-53` — `agUiEventToAction`
- `frontend/store/useChatStore.ts:61-262` — dispatch switch

**Problem**

The entire AG-UI → `ChatAction` translation (incl. HITL Zod parse) lives inside a
React hook. Only testable by rendering + mocking `HttpAgent`. Highest-value pure
logic in the app, trapped.

**Solution**

Move `agUiEventToAction` to `lib/contract/eventTransform.ts` as a pure function.
Hook just pipes events → transform → dispatch.

**Benefit**

- Leverage: event mapping unit-tested with plain objects — no React, no network.
- Highest test ROI in the frontend.

---

### 6. Fix the phantom `useAppStore` — store seam mismatch

**Files**

- `frontend/__tests__/useAppStore.test.ts`
- `frontend/__tests__/ChatPanel.test.tsx`
- `frontend/__tests__/LeftPanel.test.tsx`
- `frontend/__tests__/TwoPanelShell.test.tsx`
- Real stores: `frontend/store/useChatStore.ts`, `useDocumentStore.ts`, `useUIStore.ts`

**Problem**

4 of 5 test suites import `@/store/useAppStore`, which does not exist. Tests
written for a unified store that got split into three. Test surface ≠ module
surface — whole suite fails at import.

**Solution**

Decide the seam: either a thin `useAppStore` facade re-exporting the three, or
rewrite tests against the split stores. (Seam-shape decision — worth grilling.)

**Benefit**

- Restores the whole frontend test suite to runnable.

---

### 7. Transport/auth module — stop re-deriving the token

**Files**

- `frontend/lib/api.ts:5-20`
- `frontend/lib/agentClient.ts:5-10`
- `frontend/lib/supabase.ts`
- Ad-hoc `createClient()` + token: `frontend/lib/hooks/useChat.ts:55`, `frontend/components/TwoPanelShell.tsx:90`, `frontend/components/LeftPanel.tsx`

**Problem**

Two transport patterns (REST `apiFetch` + `HttpAgent`) + token-fetching
duplicated in 3+ spots. No single seam for "authenticated call to FastAPI." No
centralized error/retry.

**Solution**

One transport module owning auth-token resolution + base URL + error mapping.
REST and `HttpAgent` both built through it.

**Benefit**

- Locality of auth/error policy.
- Mockable in tests via one seam instead of patching Supabase everywhere.

---

### 8. Decompose `TwoPanelShell` + polling-as-side-effect

**Files**

- `frontend/components/TwoPanelShell.tsx:78-179` — nested `AppHeader` (auth + menu + threadId + signout)
- `frontend/components/LeftPanel.tsx:58-90` — resolver `setInterval` polling
- `frontend/lib/hooks/useDocuments.ts:39-50` — 3s poll loop

**Problem**

236-line shell mixes auth, header, resize, theme, collapse. Conflict-resolver
polling is a side effect buried in LeftPanel with fragile cleanup (no in-flight
cancel, no backoff). Lower deepening value than 5–7, high maintenance friction.

**Solution**

Lift auth/threadId out of the view. Make resolver-status polling its own
hook/module with cancellation.

**Benefit**

- Smaller, testable view.
- Polling logic owns its lifecycle in one place.

---

## Priority

Highest leverage (each concentrates real complexity + unlocks impossible-today tests):

1. Backend #1 — chunk-repository seam
2. Backend #2 — pure/IO split in `chunk_and_embed`
3. Backend #3 — agent-builder seam
4. Frontend #5 — pure event-transform module
5. Frontend #6 — phantom `useAppStore` (cheap, unblocks whole suite)

Then #4, #7, #8.

> No interfaces designed yet. Grill a candidate before writing code.
