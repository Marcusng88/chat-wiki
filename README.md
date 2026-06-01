# chat-wiki

**Turn a pile of documents into a chat-able, self-organizing knowledge base — one that knows when its own sources disagree and asks you which to trust.**

Upload your PDFs, slides, notes, and images. chat-wiki extracts them, builds a searchable wiki and topic index automatically, and lets you ask questions in plain language. When two of your documents contradict each other, it doesn't quietly pick one — it pauses, shows you the conflict, and lets you decide.

---

## Demo

Three short clips walk through the product end to end.

### 1. Document ingestion → wiki + index
Drop a file → live status (`extract → chunk → embed → wiki → index`) → it becomes `ready` and queryable.

https://github.com/Marcusng88/chat-wiki/raw/main/assets/docs_ingestion_demo.mp4

### 2. Generative UI
The assistant answers by emitting rich UI cards (charts, tables, comparisons) instead of plain text.

https://github.com/Marcusng88/chat-wiki/raw/main/assets/generative_ui_demo.mp4

### 3. Conflict governance (human-in-the-loop)
Two sources disagree → the assistant pauses mid-answer, surfaces a decision card, and resumes on your call.

https://github.com/Marcusng88/chat-wiki/raw/main/assets/user_governance_hitl_demo.mp4

---

## Why this exists

Most "chat with your docs" tools treat every source as equally true and silently blend them. That's fine until two files disagree on a number, a date, or a policy — then the assistant confidently gives you an answer with no idea it just averaged two contradicting facts.

chat-wiki treats **source evidence as sacred** and layers everything else on top of it:

1. **Source evidence** — your raw files, stored immutably.
2. **Retrieval structures** — chunks + vector embeddings derived *only* from raw text.
3. **Synthesized knowledge** — AI-generated wiki pages and a topic index.
4. **Governance** — detected conflicts and the human decisions that resolve them.

The assistant can read and synthesize, but it can never overwrite your files or hide a conflict from you.

---

## Key features

### 1. Automatic ingestion → wiki + index
Drop in a file and an AI agent pipeline takes over: extract text → chunk → embed → generate a wiki page → build a topic index → scan for conflicts. You watch the status update live; the document becomes queryable only once it's fully `ready`.

### 2. Conflict-aware Q&A with human-in-the-loop (HITL)
When the assistant retrieves evidence to answer you and finds a flagged conflict between sources, it **interrupts** mid-answer and renders a decision card inline in the chat: here are the two sources, here's what they disagree on, here's my recommendation. You approve, skip, or send a note back — and the assistant resumes with your call.

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | **Next.js (App Router) + React 19** | Server components + streaming UI for SSE chat. |
| State | **Zustand** | Minimal, no-boilerplate store for chat + document state. |
| Agent transport | **AG-UI (`@ag-ui/client`)** | SSE streaming of agent events (tokens, tool calls, interrupts) over one protocol. |
| Generative cards | **OpenUI** | Agent emits UI as data; frontend renders it generically. |
| Backend | **FastAPI + uv** | Async-native, first-class SSE, fast dependency management. |
| Agents | **DeepAgents + LangGraph** | `create_deep_agent` for tool-using agents; LangGraph `interrupt()` powers HITL. |
| LLM / embeddings | **OpenAI** (switchable to Gemini) | Abstracted behind one provider module. |
| Database | **Supabase Postgres + pgvector** | Relational data + vector search in one place. |
| Storage / Auth / Realtime | **Supabase** | Direct file upload, JWT auth, live status updates. |

A short rationale for the bigger architectural decisions lives in **[docs/ARCHITECTURE.md](ARCHITECTURE.md)**.

---

## Repository layout

```
.
├── frontend/              # Next.js app (App Router)
│   ├── app/               # routes, auth callback
│   ├── components/        # ChatPanel, LeftPanel, HITLCard, MaterialRow, ...
│   ├── lib/               # api client, agent client, hooks, contracts
│   └── store/             # Zustand stores (chat, documents)
├── backend/               # FastAPI service
│   ├── main.py            # app entry, routers, CORS, DB pool lifespan
│   └── app/
│       ├── api/           # /agent/chat, /agent/resolve, /documents/*
│       ├── agents/        # chat, docs_ingestion, conflict_resolver agents + tools
│       ├── db/            # connection pool + query modules
│       └── utils/         # model_provider (LLM/embeddings/checkpointer)
└── docs/                  # architecture + design notes
```

---

## Getting started

### Prerequisites
- **Node 20+** and **pnpm**
- **Python 3.13+** and **uv**
- A **Supabase** project (Postgres with the `pgvector` extension enabled, plus Storage + Auth)
- An **OpenAI API key**

### 1. Supabase setup
Create a project and enable the `vector` extension. The app uses these tables:

- `documents` — one row per uploaded file (status, summary, topics, wiki page)
- `chunks` — raw text chunks + embeddings (pgvector)
- `conflicts` + `conflict_documents` — detected conflicts and their member documents

Create a Storage bucket for raw files, and grab your project URL, anon key, service-role key, JWT secret, and database connection string.

### 2. Backend
```bash
cd backend
cp .env.example .env        # fill in the values below
uv sync
uv run fastapi dev main.py  # serves on http://localhost:8000
```

`.env`:
```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=postgresql://postgres:[pwd]@db.xxx.supabase.co:5432/postgres
SUPABASE_JWT_SECRET=
OPENAI_API_KEY=

# optional — LangSmith tracing for debugging agent runs
LANGSMITH_TRACING=true
LANGSMITH_API_KEY=
LANGSMITH_PROJECT=chat-wiki
```

### 3. Frontend
```bash
cd frontend
cp .env.example .env        # fill in the values below
pnpm install
pnpm dev                    # serves on http://localhost:3000
```

`.env`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

Open http://localhost:3000, sign in, and upload a document.

---

## How to use it

1. **Upload** a file from the left panel. Watch its status badge move from `uploading` → `processing` → `ready`.
2. **Ask a question** in the chat. The assistant searches your library, reads the relevant evidence, and answers.
3. **Resolve conflicts.** If the assistant hits a conflict, it pauses and shows a decision card. Pick a source, skip, or send a note. The flag on the left panel clears once you've decided.

---

## API surface

All backend routes; the frontend talks to these (auth via Supabase JWT in the `Authorization` header).

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/agent/chat` | Streaming chat (SSE). Carries HITL resume commands. |
| `POST` | `/agent/resolve` | Run the conflict-resolver agent (flags conflicts). |
| `POST` | `/documents/presign` | Get a presigned URL for direct-to-storage upload. |
| `POST` | `/documents/confirm` | Register the upload; triggers background ingestion. |
| `GET`  | `/documents` | List the user's documents (with conflict flags). |
| `GET`  | `/documents/{id}/raw` | Fetch the raw stored file. |
| `DELETE` | `/documents/{id}` | Hard-delete a document and everything derived from it. |
| `GET`  | `/health` | Liveness check. |

---

## Tests

```bash
# backend
cd backend && uv run pytest

# frontend
cd frontend && pnpm test
```

---

## Design notes & trade-offs

- **Embeddings come from raw chunks only**, never from AI-generated wiki text — so retrieval always traces back to real source evidence, not a paraphrase.
- **Wiki pages are agent-generated and read-only.** Users edit sources, not synthesized knowledge; this keeps the evidence chain intact.
- **The resolver only flags; it never mutates.** Deleting or preferring a source is always a human decision, surfaced through HITL.
- **One conflict at a time.** HITL deliberately handles a single decision per interrupt to keep the choice unambiguous.

See **[ARCHITECTURE.md](ARCHITECTURE.md)** for the full picture, including flowcharts.

---

## License

See [LICENSE](LICENSE).
