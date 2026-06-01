# Chat Wiki — Database Schema

## Design Principles

- No custom `users` table — reference `auth.users` directly via RLS `auth.uid()`
- Embeddings stored as column on `chunks` — avoids join on every vector search
- No `index_entries` table — agent uses `documents.summary` + `documents.topics[]` to narrow retrieval scope
- No `hitl_requests` table — HITL state lives on `conflicts.status`; agent interrupt state lives in LangGraph checkpointer
- No `conflict_history` — `conflicts.resolution_notes` covers MVP audit needs
- `conflict_documents.role` dropped — `conflicts.preferred_document_id` already captures preference

---

## Tables

### `documents`

Tracks uploaded materials and their ingestion state. Frontend subscribes via Supabase Realtime for live status updates.

```sql
id                uuid        PRIMARY KEY DEFAULT gen_random_uuid()
user_id           uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
title             text        NOT NULL
file_type         text        NOT NULL        -- pdf | md | txt | pptx | image | unsupported
storage_path      text        NOT NULL        -- full Supabase Storage path: users/{user_id}/documents/{filename}
status            text        NOT NULL        -- see status enum below
wiki_page         text                        -- agent-generated wiki content (nullable until ready)
summary           text                        -- short summary for agent index scan (nullable until ready)
topics            text[]                      -- keyword topics for agent index scan
created_at        timestamptz NOT NULL DEFAULT now()
updated_at        timestamptz NOT NULL DEFAULT now()
```

**Status enum:**
```
uploaded → extracting → chunking → embedding → generating_wiki → indexing → conflict_scan → ready
                                                                                           ↘ failed_extraction
                                                                                           ↘ failed_embedding
                                                                                           ↘ failed_wiki
                                                                                           ↘ failed_indexing
                                                                                           ↘ unsupported
```

Material is queryable **only** when `status = ready`.

---

### `chunks`

Raw text chunks from documents. Embeddings stored directly here — no separate embeddings table.

```sql
id                uuid        PRIMARY KEY DEFAULT gen_random_uuid()
document_id       uuid        NOT NULL REFERENCES documents(id) ON DELETE CASCADE
chunk_index       int         NOT NULL        -- order within document
content           text        NOT NULL        -- raw chunk text
page_ref          text                        -- nullable; e.g. "page 3" for PDFs
embedding         vector(1536)                -- pgvector; null until embedding step completes
embedding_model   text                        -- e.g. "text-embedding-3-small"
created_at        timestamptz NOT NULL DEFAULT now()
```

Vector similarity search runs against `chunks.embedding` using pgvector `<=>` operator.

---

### `conflicts`

Flagged by Resolver Agent. Resolved via HITL flow in Main Agent chat.

```sql
id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid()
user_id               uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
conflict_type         text        NOT NULL        -- duplicate | outdated | contradictory
status                text        NOT NULL        -- flagged | hitl_pending | resolved | dismissed
preferred_document_id uuid                        -- nullable; set when user picks preferred source
resolution_notes      text                        -- nullable; set on resolution
created_at            timestamptz NOT NULL DEFAULT now()
updated_at            timestamptz NOT NULL DEFAULT now()
```

**Status flow:**
```
flagged → hitl_pending → resolved
                       → dismissed
```

- `flagged` — Resolver flagged, not yet surfaced to user
- `hitl_pending` — Main Agent surfaced HITL card, awaiting user decision
- `resolved` — user approved action, executed
- `dismissed` — user chose to keep both, no action taken

---

### `conflict_documents`

Join table linking conflicts to the documents involved.

```sql
id            uuid    PRIMARY KEY DEFAULT gen_random_uuid()
conflict_id   uuid    NOT NULL REFERENCES conflicts(id) ON DELETE CASCADE
document_id   uuid    NOT NULL REFERENCES documents(id) ON DELETE CASCADE
```

Preferred document is on `conflicts.preferred_document_id`, not here.

---

## Supabase Features Mapping

| Feature | Used For |
|---|---|
| Postgres | All structured metadata |
| pgvector | `chunks.embedding` — similarity search |
| Storage | Raw file storage; path in `documents.storage_path` |
| Auth | `auth.users` as identity; JWT → RLS |
| RLS | `auth.uid() = user_id` on all tables |
| Realtime | `documents` table — frontend polls ingestion status |

---

## RLS Policy Pattern

All tables use the same pattern:

```sql
-- SELECT
auth.uid() = user_id

-- INSERT
auth.uid() = user_id

-- UPDATE / DELETE
auth.uid() = user_id
```

`conflict_documents` derives user isolation via `conflicts.user_id` — apply RLS using a join or add `user_id` column if performance requires it.
