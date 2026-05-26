# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working in this repository.

---

## Communication & Workflow

- **Always** use `/caveman` mode for all communication.
- Use `/grill-me` when planning features or reviewing designs before implementing.
- Apply `/karpathy-guidelines` when writing or reviewing code.

---

## Stack

### Frontend (`/frontend`)
- Next.js (App Router)
- Package manager: **pnpm** (`pnpm install`, `pnpm dev`, `pnpm build`)
- `@ag-ui/client` — HttpAgent connects to FastAPI SSE endpoints
- `@supabase/supabase-js` — auth session + Realtime subscriptions only (not DB writes)

### Backend (`/backend`)
- FastAPI + uv
- `deepagents` (`create_deep_agent`) + LangGraph — use Context7 tool for docs
- LangSmith: tracing via `LANGCHAIN_TRACING_V2=true` (playground debug)
- Package manager: **uv**

### Infrastructure
- Supabase: Postgres + pgvector + Storage + Auth + Realtime
- Row-Level Security — `auth.uid()` for per-user isolation
- AG-UI: SSE transport, separate endpoint per agent

---

## Package Management Rules

### Python (backend)
- **Never directly edit `pyproject.toml`**
- Add deps: `uv add <package>`
- Remove deps: `uv remove <package>`
- Run: `uv run <cmd>` / Sync: `uv sync`

### Node (frontend)
- Install: `pnpm install`
- Add: `pnpm add <package>` / Dev: `pnpm add -D <package>`

---

## Dev Commands

### Backend
```bash
uv run fastapi dev backend/main.py
uv run pytest
uv run pytest tests/path/test_file.py
```

### Frontend
```bash
pnpm dev
pnpm build
pnpm lint
```

---

## Architecture

### Knowledge Hierarchy (foundational)
1. **Source Evidence** — immutable raw files (Supabase Storage)
2. **Retrieval Structures** — chunks + embeddings (pgvector) + index entries
3. **Synthesized Knowledge** — agent-generated wiki pages (not user-editable)
4. **Governance Metadata** — conflicts, HITL approvals, preferred-reference flags

### Three DeepAgents (`create_deep_agent`)
| Agent | Endpoint | Role |
|---|---|---|
| **Main** | `POST /agent/chat` | Q&A, retrieval orchestration, HITL card generation |
| **Document Processor** | `POST /agent/ingest` | Extract → chunk → embed → wiki (iterative) → index (post-wiki) |
| **Resolver** | `POST /agent/resolve` | Flags conflicted docs in DB only — never auto-mutates |

### Model Provider (`model_provider.py`)
- Switchable LLM: Gemini or OpenAI via `init_chat_model`
- Switchable embeddings: same file
- Switchable checkpointer: `MemorySaver` (dev) or `AsyncPostgresSaver` (prod)

### Ingestion Pipeline
```
Upload → FastAPI presigned URL → Direct to Supabase Storage
→ FastAPI BackgroundTask → Document Processor DeepAgent
→ Extract → Chunk (LangChain text splitter) → Embed (raw chunks only)
→ DeepAgent iterative wiki generation
→ DeepAgent index generation (post-wiki)
→ Conflict scan flag → Ready
```
Material queryable only when `status == ready`.

### File Upload Flow
1. Frontend requests presigned URL from FastAPI
2. Frontend uploads directly to Supabase Storage
3. FastAPI inserts `documents` row → `BackgroundTasks` triggers ingestion

### Ingestion Status Updates
- Frontend subscribes to `documents` table via Supabase Realtime
- No extra FastAPI streaming needed for status

### Retrieval Flow
```
User Query → Main Agent → Index Lookup → Candidate Wiki Pages
→ Conflict Flag Check → Chunk Retrieval → Response Synthesis
```

### HITL Flow
- Resolver flags docs → left panel shows conflict status
- Main Agent encounters flag during retrieval → generates fixed HITL card inline in chat
- Card pauses/interrupts agent flow — user approves/rejects/modifies
- One conflict at a time

### A2UI
- Generic JSON renderer in chat panel
- Main Agent generates any card schema at runtime
- Separate from HITL fixed card

### Thread Model
- One active thread per user (`thread_id` keyed by `user_id`)
- New Chat: deletes old checkpointer state, fresh `thread_id`

### Data Access Boundaries
| Operation | Via |
|---|---|
| Auth, Realtime, Storage upload | Next.js → Supabase direct |
| Chat, ingestion trigger, document CRUD, conflicts | Next.js → FastAPI |
| All DB operations | FastAPI → Supabase (service role) |

### UI Layout (two-panel)
- **Left**: upload, material list + status badges, ingestion status, conflict flags, Resolver button
- **Main**: chat messages, HITL fixed cards (inline), A2UI generic cards, source refs

---

## Database Schema (Supabase Postgres)

Key tables: `users`, `documents`, `chunks`, `embeddings`, `index_entries`, `conflicts`, `conflict_documents`, `conflict_history`, `hitl_requests`

`documents.status` drives queryability — always check before retrieval.

---

## Key Constraints

- Main agent cannot mutate raw files or bypass HITL
- Resolver flags only — no auto-delete, no auto-overwrite, no HITL card generation
- Wiki pages agent-generated only, non-user-editable
- Embeddings from raw chunks only (no wiki content) — preserves evidence fidelity
- Deletion is hard delete: file + wiki + chunks + embeddings + indexes + metadata
- Never directly edit `pyproject.toml` — use `uv add` / `uv remove`
