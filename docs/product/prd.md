# Chat Wiki — Agentic Personal Knowledge System

## Product Requirements Document (PRD)

Version: 1.0
Status: Draft
Author: ChatGPT
Date: 2026-05-27

---

# 1. Executive Summary

Chat Wiki is an agentic personal knowledge system that combines:
- conversational Q&A,
- persistent wiki synthesis,
- retrieval-augmented generation (RAG),
- conflict governance,
- HITL (human-in-the-loop) approval flows,
- structured knowledge indexing,
- and optional generative UI.

The system is inspired conceptually by the “LLM Wiki” idea:
- uploaded materials become persistent knowledge artifacts,
- the system synthesizes and maintains a wiki layer,
- retrieval is guided by structured knowledge rather than pure vector search.

The MVP is explicitly:
- single-user,
- personal workspace only,
- agent-generated wiki only,
- Q&A-first interaction model,
- human-approved conflict handling.

The product is NOT:
- a traditional chatbot,
- a pure vector database frontend,
- a fully autonomous agent,
- a collaborative wiki platform,
- or a general document management system.

The system behaves as:
- a personal knowledge operating system,
- with conversational access,
- persistent synthesized knowledge,
- and governance-aware retrieval.

---

# 2. Product Goals

## Primary Goals

1. Allow users to upload knowledge materials.
2. Transform uploaded materials into persistent wiki knowledge.
3. Provide conversational Q&A grounded in user knowledge.
4. Detect and manage conflicting or outdated knowledge.
5. Maintain trust through HITL approvals.
6. Make retrieval more intelligent than standard vector RAG.

## Secondary Goals

1. Support multimodal ingestion.
2. Improve retrieval efficiency using indexing.
3. Support expandable future agent workflows.
4. Support generative UI outputs.
5. Preserve explainability and provenance.

---

# 3. Non-Goals (MVP)

The MVP will NOT include:

- collaborative/team workspaces,
- cross-user shared knowledge,
- autonomous wiki rewriting,
- user-editable wiki pages,
- continuous background autonomous maintenance,
- chat-to-wiki writeback,
- OCR-heavy pipelines,
- advanced knowledge graphs,
- semantic ontology management,
- citation confidence scoring,
- historical wiki versioning,
- auto-merging contradictory knowledge,
- browser extensions,
- cloud sync across providers,
- advanced permission systems.

---

# 4. Core Product Philosophy

## 4.1 Knowledge Hierarchy

The system separates:

1. Source Evidence
2. Retrieval Structures
3. Synthesized Knowledge
4. Governance Metadata

This separation is foundational.

### Source Evidence
Immutable uploaded files.

### Retrieval Structures
Chunks, embeddings, and index entries.

### Synthesized Knowledge
Agent-generated wiki pages.

### Governance Metadata
Conflicts, approvals, preferences, and decisions.

---

# 5. High-Level Architecture

```text
User Uploads Material
        ↓
Document Processor DeepAgent
        ↓
Raw File Storage (Supabase Storage)
        ↓
Extraction Pipeline
        ↓
Chunking
        ↓
Embeddings
        ↓
Wiki Generation
        ↓
Book-Style Index Generation
        ↓
Conflict Detection
        ↓
Ready State
        ↓
Main DeepAgent Retrieval
        ↓
Q&A + Citations + HITL + A2UI
```

---

# 6. System Components

## 6.1 Main DeepAgent

Primary conversational Q&A agent.

Responsibilities:
- answer user questions,
- retrieve wiki pages,
- retrieve source snippets,
- inspect conflict metadata,
- ask clarification questions,
- create HITL requests,
- orchestrate retrieval,
- optionally generate A2UI payloads.

Restrictions:
- cannot directly mutate raw files,
- cannot bypass HITL approval,
- cannot silently delete knowledge.

---

## 6.2 Document Processor DeepAgent

Responsible for ingestion.

Responsibilities:
- detect file type,
- extract text,
- extract images from PDFs,
- invoke multimodal LLMs when necessary,
- generate chunks,
- generate embeddings,
- generate wiki pages,
- generate index entries,
- scan for conflicts,
- update ingestion status.

---

## 6.3 Resolver DeepAgent

Resolver is NOT autonomous.

Resolver acts as:
- detector,
- analyzer,
- proposer.

Responsibilities:
- detect duplicated knowledge,
- detect outdated knowledge,
- generate conflict metadata,
- propose preferred references,
- generate recommendations.

Resolver does NOT:
- auto-delete files,
- auto-overwrite wiki pages,
- mutate embeddings directly,
- bypass user approval.

---

## 6.4 HITL System

Human approval layer.

Every material mutation requires approval.

Supported actions:
- approve,
- reject,
- modify action/details.

HITL cards are generated:
- by main agent,
- based on resolver findings,
- one conflict at a time.

---

## 6.5 A2UI Generator

Optional generative UI layer.

Used only when useful.

Examples:
- conflict cards,
- comparison cards,
- source viewers,
- material previews,
- structured summaries.

A2UI outputs declarative JSON only.

---

# 7. Workspace Model

## MVP Model

Single-user personal workspace.

Each user has:
- isolated storage,
- isolated embeddings,
- isolated wiki pages,
- isolated conflicts.

No shared workspaces.

---

# 8. Supported File Types

MVP Supported Types:

- PDF
- Markdown (.md)
- Text (.txt)
- PowerPoint (.ppt/.pptx)
- Images

Unsupported files:
- remain visible,
- marked unsupported,
- excluded from ingestion.

---

# 9. Ingestion Pipeline

## 9.1 Pipeline Overview

```text
Upload
→ Store Raw File
→ Type Detection
→ Extraction
→ Chunking
→ Embeddings
→ Wiki Generation
→ Index Generation
→ Conflict Scan
→ Ready
```

---

## 9.2 Extraction Strategy

### PDF
Primary:
- deterministic extraction library.

Examples:
- PyMuPDF,
- pypdf.

If embedded images exist:
- extract images separately,
- optionally send image to multimodal LLM,
- generate visual notes.

### Markdown/TXT
Deterministic parsing only.

### PPT
Extract slide text and structure.

### Images
Use multimodal LLM.

Purpose:
- visual interpretation,
- concise extraction,
- wiki synthesis support.

No OCR-heavy pipeline in MVP.

---

# 10. Chunking Strategy

Chunking exists primarily for:
- embeddings,
- retrieval.

## Strategy

Structure-aware first.

Preferred boundaries:
- headings,
- paragraphs,
- pages,
- slide boundaries.

Fallback:
- token chunking.

Chunks are tied to:
- source file,
- page/slide reference,
- chunk position.

---

# 11. Embedding Strategy

Embeddings are generated from:
- raw chunk text only.

Wiki content is NOT embedded into source chunk embeddings.

Reason:
- preserve evidence fidelity,
- prevent synthesized drift contamination,
- keep retrieval stable.

Optional future extension:
- separate wiki embeddings.

---

# 12. Wiki Layer

## Definition

The “summary” concept is implemented as:
- a persistent wiki page.

Each uploaded material creates:
- one generated wiki page.

Wiki pages are:
- generated-only,
- non-user-editable,
- replaceable by future resolver-approved updates.

---

## 12.1 Wiki Content

Wiki pages may contain:
- concise summaries,
- concepts,
- entities,
- relationships,
- important facts,
- extracted visual notes,
- retrieval hints.

---

## 12.2 Wiki Metadata

Metadata includes:
- generated_at,
- source_refs,
- preferred_reference flags,
- conflict references,
- superseded notes.

---

# 13. Book-Style Index System

The system maintains a lightweight index.

Purpose:
- help agents understand corpus structure,
- narrow retrieval scope,
- accelerate retrieval.

The index is NOT:
- a graph database,
- a canonical source of truth.

---

## 13.1 Index Granularity

Two levels:

### Document-Level
Stores:
- document keywords,
- document topics,
- high-level references.

### Chunk-Level
Stores:
- localized terms,
- references,
- chunk pointers.

---

## 13.2 Index Generation

Generated automatically during ingestion.

Not user-editable.

---

# 14. Conflict System

## 14.1 Purpose

The system must detect:
- duplicated knowledge,
- outdated knowledge,
- conflicting facts.

Conflicts are NOT auto-resolved.

---

## 14.2 Conflict Lifecycle

```text
Conflict Detected
→ Metadata Created
→ Main Agent Encounters Conflict
→ User Prompted
→ HITL Card Generated
→ User Approval
→ Action Executed
```

---

## 14.3 Conflict Types

### Duplicate
Overlapping knowledge.

### Outdated
Older information superseded by newer material.

### Contradictory
Conflicting factual statements.

---

## 14.4 Conflict Resolution Actions

### Remain
Keep both materials.

Then:
- ask which source is preferred/latest.

### Modify
Update conflict metadata only.

### Delete
Hard delete specific material only.

Deletion removes:
- raw file,
- wiki page,
- chunks,
- embeddings,
- indexes,
- ingestion metadata.

---

## 14.5 Preferred Reference

When user selects:
- preferred/latest reference,

system stores:
- preferred source in conflict metadata,
- wiki metadata hints.

Main agent later prioritizes:
- preferred source during retrieval.

---

## 14.6 Conflict Decision Order

One conflict card at a time.

User resolves:
- first conflict,
- then next.

No bulk conflict resolution in MVP.

---

# 15. HITL Approval System

## Actions

Supported:
- approve,
- reject,
- modify action/details.

---

## Approval Requirement

Required for:
- deletion,
- wiki overwrite,
- preferred-source selection,
- metadata modifications.

---

## HITL UX

Cards contain:
- conflict explanation,
- involved sources,
- recommended action,
- diff/reason,
- action controls.

---

# 16. Retrieval Architecture

## Philosophy

This is NOT pure vector RAG.

Retrieval is:
- agentic,
- structured,
- governance-aware.

---

## 16.1 Retrieval Flow

```text
User Query
→ Main Agent
→ Index Lookup
→ Candidate Wiki Pages
→ Conflict Metadata Check
→ Chunk Retrieval
→ Source Snippet Retrieval
→ Response Synthesis
```

---

## 16.2 Retrieval Hierarchy

### Primary Surface
Wiki pages.

### Secondary Surface
Source chunks/snippets.

### Evidence Layer
Raw files.

---

## 16.3 Conflict-Aware Retrieval

If conflicting knowledge exists:
- main agent surfaces ambiguity,
- asks user what to do,
- generates HITL request.

Agent should NOT silently choose uncertain knowledge.

---

# 17. Chat Experience

## Main Interaction Model

Q&A assistant.

Examples:
- “What is my name?”
- “Summarize my AI notes.”
- “What did I write about transformers?”

---

## Proactive Behaviors

Allowed:
- notifying conflicts,
- suggesting maintenance actions,
- surfacing ambiguity.

Not allowed:
- autonomous wiki rewriting,
- autonomous deletion.

---

## Source Access

Responses include:
- optional source references,
- expandable evidence access.

---

## Attachments

Agent may attach:
- relevant materials,
- snippets,
- source references.

---

# 18. UI/UX Design

## 18.1 Layout

Three-panel structure.

### Left Panel
Knowledge/system operations.

Contains:
- ingestion status,
- processing states,
- conflicts,
- resolver status,
- resolve conflict actions.

---

### Main Panel
Chat experience.

Contains:
- messages,
- source references,
- HITL cards,
- optional A2UI outputs.

---

### Right Panel
Material explorer.

Contains:
- uploaded material thumbnails,
- status badges,
- save/download actions,
- delete actions,
- expandable modal summaries.

---

# 19. Material Card UX

Each material card shows:
- title,
- type,
- upload time,
- processing status,
- thumbnail,
- quick summary.

Actions:
- download/save locally,
- delete,
- open modal.

---

## 19.1 Expanded Modal

Displays:
- wiki page preview,
- metadata,
- source references,
- conflict status,
- ingestion details.

---

# 20. Deletion UX

Deletion is:
- hard delete,
- confirmation-required.

Deletion scope:
- specific material only.

Does not affect:
- unrelated materials.

---

# 21. Material States

## Processing States

```text
uploaded
extracting
chunking
embedding
generating_wiki
indexing
conflict_scan
ready
```

---

## Failure States

```text
failed_extraction
failed_embedding
failed_wiki
failed_indexing
unsupported
```

---

## Failure UX

Failed materials remain visible.

User may:
- retry,
- delete.

Failed materials are:
- excluded from retrieval,
- excluded from wiki access.

---

# 22. Queryability Rules

A material becomes queryable ONLY when:
- ingestion state == ready.

No partial retrieval allowed.

Reason:
- consistency,
- trust,
- predictable retrieval.

---

# 23. Supabase Architecture

## Services Used

### Supabase Postgres
Structured metadata.

### pgvector
Embeddings.

### Supabase Storage
Raw files.

### Row-Level Security
Per-user isolation.

---

# 24. Suggested Database Schema

## users

```sql
id
email
created_at
```

---

## documents

```sql
id
user_id
title
file_type
storage_path
status
wiki_page
created_at
updated_at
```

---

## chunks

```sql
id
document_id
chunk_index
content
page_ref
created_at
```

---

## embeddings

```sql
id
chunk_id
embedding
model
created_at
```

---

## index_entries

```sql
id
document_id
chunk_id
term
context
created_at
```

---

## conflicts

```sql
id
conflict_type
status
preferred_document_id
created_at
updated_at
```

---

## conflict_documents

```sql
id
conflict_id
document_id
role
```

---

## conflict_history

```sql
id
conflict_id
action
performed_by
notes
created_at
```

---

## hitl_requests

```sql
id
request_type
status
payload
created_at
resolved_at
```

---

# 25. Backend Architecture

## Stack

- FastAPI
- LangGraph
- LangChain DeepAgents
- LangSmith
- Supabase
- AG-UI
- A2UI

---

## LangGraph Usage

Used for:
- orchestration,
- streaming,
- graph execution,
- local dev UI.

---

## LangSmith Usage

Used for:
- traces,
- debugging,
- graph inspection,
- execution analysis.

---

## FastAPI Usage

Used for:
- HTTP endpoints,
- AG-UI bridge,
- file uploads,
- websocket/event streaming.

---

# 26. AG-UI Integration

AG-UI acts as:
- frontend/backend event protocol.

Streams:
- messages,
- tool calls,
- agent events,
- HITL requests,
- A2UI payloads.

---

# 27. A2UI Integration

A2UI used optionally.

Examples:
- conflict cards,
- comparison UI,
- source viewers,
- metadata inspectors.

A2UI outputs:
- declarative JSON only.

No executable UI generation.

---

# 28. Security & Trust

## Principles

- human approval before mutation,
- explainable retrieval,
- explicit conflict surfacing,
- no hidden deletions,
- provenance preservation.

---

# 29. Performance Considerations

## Retrieval Optimization

Use:
- index narrowing before vector search.

Reason:
- reduce embedding search scope,
- reduce latency,
- reduce hallucination.

---

## Embedding Scope

Only query:
- candidate chunks,
- not entire corpus.

---

# 30. Future Extensions

Potential future features:

- team workspaces,
- collaborative governance,
- wiki version history,
- autonomous maintenance agents,
- knowledge graph overlays,
- citation confidence scoring,
- browser ingestion,
- chat-derived knowledge objects,
- semantic entity linking,
- background re-indexing,
- temporal reasoning,
- multi-agent debate.

---

# 31. Risks

## Product Risks

### Over-Agentification
Too much automation reduces trust.

Mitigation:
- HITL-first design.

---

## Retrieval Drift
Wiki diverges from evidence.

Mitigation:
- preserve raw sources,
- preserve citations,
- conflict governance.

---

## Conflict Explosion
Too many conflicts overwhelm users.

Mitigation:
- one conflict card at a time.

---

## Ingestion Reliability
Different file types fail unpredictably.

Mitigation:
- whitelist formats,
- visible failure states.

---

# 32. MVP Success Criteria

The MVP is successful if:

1. Users can upload supported materials.
2. Materials reliably become searchable wiki knowledge.
3. Main agent answers grounded questions correctly.
4. Conflicts are surfaced transparently.
5. Users trust the approval system.
6. Retrieval feels smarter than standard RAG.
7. The system remains explainable.

---

# 33. Final Product Definition

Chat Wiki is:

> a personal agentic knowledge operating system that transforms uploaded materials into persistent synthesized wiki knowledge, supports

---

# 34. Technical Implementation Decisions

## 34.1 LLM & Embedding Providers

- Providers: Google Gemini + OpenAI (switchable)
- Single `model_provider.py` file controls LLM + embedding model
- Uses `langchain.chat_models.init_chat_model` for provider-agnostic instantiation
- Never hardcode provider — always route through `model_provider.py`

---

## 34.2 Agent Framework

- Package: `deepagents` (`from deepagents import create_deep_agent`)
- Three agents: Main, Document Processor, Resolver
- Each agent = `create_deep_agent(model, tools, system_prompt, subagents)`
- LangGraph for orchestration + streaming
- LangSmith: tracing only via `LANGCHAIN_TRACING_V2=true` env var (playground debugging)

---

## 34.3 AG-UI Integration

- Frontend: `@ag-ui/client` — `HttpAgent` connects to FastAPI SSE endpoints
- Transport: Server-Sent Events (SSE)
- Separate FastAPI endpoints per agent:
  - `POST /agent/chat` — Main DeepAgent
  - `POST /agent/ingest` — Document Processor DeepAgent
  - `POST /agent/resolve` — Resolver DeepAgent

---

## 34.4 Authentication & Data Access

- Auth: Supabase Auth (JWT → RLS `auth.uid()`)
- Next.js → Supabase direct: auth session management + Realtime subscriptions only
- Next.js → FastAPI: all business logic (document CRUD, chat, ingestion trigger, conflicts)
- FastAPI → Supabase: all DB operations using service role key

---

## 34.5 File Upload Flow

1. Frontend requests presigned URL from FastAPI
2. Frontend uploads file directly to Supabase Storage using presigned URL
3. FastAPI inserts `documents` row → triggers ingestion via `BackgroundTasks`

---

## 34.6 Ingestion Pipeline

- Execution: FastAPI `BackgroundTasks` (no Celery/Redis for MVP)
- Status updates: Supabase Realtime — frontend subscribes to `documents` table row
- Chunking: LangChain text splitter → embed (no structure-aware chunking)
- Embeddings: raw chunk text only (no wiki contamination)

### Document Processor DeepAgent Pipeline

```
Upload → Store Raw → Extract Text → Chunk → Embed
→ DeepAgent: iterative wiki generation (reads chunks via tools)
→ DeepAgent: index generation (post-wiki, reads wiki + chunks)
→ Conflict scan flag update
→ Ready
```

---

## 34.7 Conflict & Resolver System

- Resolver = Resolver DeepAgent (`create_deep_agent`)
- Trigger: manual button in left panel (not automatic post-ingestion)
- Scope: unscanned/unresolved docs only (skips already-checked)
- Action: flags conflicted docs in DB only — does NOT generate HITL cards
- HITL cards: generated by Main Agent in chat when it encounters flagged docs during retrieval

---

## 34.8 HITL System

- Fixed card component (not A2UI generic renderer)
- Appears inline in chat panel
- Triggered when Main Agent encounters conflict-flagged docs during retrieval
- Interrupts and pauses agent flow pending user approval

---

## 34.9 A2UI System

- Generic JSON renderer — agent defines card schema at runtime
- Main Agent generates any card type it deems necessary
- Rendered in chat panel (separate from HITL fixed card)

---

## 34.10 LangGraph Checkpointer

- Switchable (same pattern as `model_provider.py`):
  - `MemorySaver` — local dev
  - `AsyncPostgresSaver` — production (Supabase Postgres)
- Thread model: one active thread per user (`thread_id` keyed by `user_id`)
- New Chat: deletes old checkpointer state, creates fresh `thread_id`

---

## 34.11 UI Layout

Two-panel layout:

### Left Panel
- Upload button + drag-and-drop
- Material list (title, type, status badge, delete)
- Ingestion status per document
- Conflict flags (from Resolver)
- Resolver button (triggers Resolver DeepAgent)

### Main Panel
- Chat messages
- HITL fixed cards (inline, interrupt flow)
- A2UI generic rendered cards
- Source references

---

## 34.12 Stack Summary

| Layer | Technology |
|---|---|
| Frontend | Next.js (App Router) + pnpm |
| Frontend state/realtime | `@supabase/supabase-js` (auth + realtime only) |
| Frontend agent protocol | `@ag-ui/client` |
| Backend | FastAPI + uv |
| Agent framework | `deepagents` + LangGraph |
| Observability | LangSmith (tracing) |
| Database | Supabase Postgres + pgvector |
| Storage | Supabase Storage |
| Auth | Supabase Auth |
| Python pkg manager | uv (never edit `pyproject.toml` directly) |