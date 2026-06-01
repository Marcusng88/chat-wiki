# Phase 1 — Backend: Retrieval Tools

## Files to create/modify

- `backend/app/agents/chat/tools/retrieval.py` — list_docs, search_documents, get_wiki_page, search_chunks, check_conflicts
- `backend/app/agents/chat/tools/hitl.py` — resolve_conflict
- `backend/app/db/conflicts.py` — DB queries for conflicts

---

## Tool: `list_docs`

**Purpose**: Enumerate all ready documents for the user. Use when agent needs to browse available material or answer "what documents do I have?".

```python
@tool
def list_docs(offset: int = 0, limit: int = 10, sort_by: str = "created_at") -> dict:
    """List available documents with summaries. offset/limit for pagination (max limit=20).
    sort_by: 'created_at' (newest first) or 'title' (alphabetical). Returns docs + total count."""
```

**DB query**:
```sql
SELECT
  id, title, summary, topics,
  EXISTS (
    SELECT 1 FROM conflict_documents cd
    JOIN conflicts c ON c.id = cd.conflict_id
    WHERE cd.document_id = documents.id
    AND c.status IN ('flagged', 'hitl_pending')
  ) AS has_conflict
FROM documents
WHERE user_id = %s AND status = 'ready'
ORDER BY
  CASE WHEN %s = 'title' THEN title END ASC,
  CASE WHEN %s = 'created_at' THEN created_at END DESC
LIMIT %s OFFSET %s
```

Run a second query for total: `SELECT COUNT(*) FROM documents WHERE user_id = %s AND status = 'ready'`

**Returns**:
```python
{
  "docs": [
    {"id": ..., "title": ..., "summary": ..., "topics": [...], "has_conflict": bool}
  ],
  "total": 47
}
```

**Constraints**: `limit` capped at 20 server-side regardless of what agent requests.

---

## Tool: `search_documents`

**Purpose**: Find candidate documents matching the user query. Searches `documents.topics[]` array (document-level index).

```python
@tool
def search_documents(query: str) -> list[dict]:
    """Find documents whose topics match the query. Returns doc id, title, status, topics, has_conflict, has_wiki."""
```

**DB query**:
```sql
SELECT
  id, title, status, topics,
  wiki_page IS NOT NULL AS has_wiki,
  EXISTS (
    SELECT 1 FROM conflict_documents cd
    JOIN conflicts c ON c.id = cd.conflict_id
    WHERE cd.document_id = documents.id
    AND c.status IN ('flagged', 'hitl_pending')
  ) AS has_conflict
FROM documents
WHERE user_id = %s AND status = 'ready' AND topics && %s
```

Use simple array overlap on `topics[]`. Only return `status = 'ready'` docs.

---

## Tool: `get_wiki_page`

**Purpose**: Fetch synthesized wiki page for a document.

```python
@tool
def get_wiki_page(document_id: str) -> dict:
    """Fetch the agent-generated wiki page for a document. Returns title and wiki_page content."""
```

**DB query**: `SELECT title, wiki_page, topics, summary FROM documents WHERE id = %s AND user_id = %s`

Returns `{"title": ..., "wiki_page": ..., "topics": [...], "summary": ...}` or error if not found.

---

## Tool: `search_chunks`

**Purpose**: Vector similarity search on raw chunks for a specific document.

```python
@tool
def search_chunks(document_id: str, query: str, limit: int = 5) -> list[dict]:
    """Retrieve the most relevant raw source chunks from a document using vector similarity."""
```

**DB query**:
1. Embed `query` using `get_embeddings()`
2. ```sql
   SELECT content, chunk_index, page_ref
   FROM chunks
   WHERE document_id = %s
   ORDER BY embedding <=> %s
   LIMIT %s
   ```

Returns `[{"content": ..., "chunk_index": ..., "page_ref": ...}]`

**Note**: `embedding` is a column on `chunks` — no separate embeddings table. Index uses `ivfflat vector_cosine_ops` → operator is `<=>`.

---

## Tool: `check_conflicts`

**Purpose**: Fetch conflict metadata for a flagged document before answering from it.

```python
@tool
def check_conflicts(document_id: str) -> list[dict]:
    """Check if a document has any active conflicts. Returns conflict details including involved documents."""
```

**DB query**:
```sql
SELECT
  c.id, c.conflict_type, c.status, c.preferred_document_id,
  array_agg(json_build_object('id', d.id, 'title', d.title)) AS documents
FROM conflicts c
JOIN conflict_documents cd ON cd.conflict_id = c.id
JOIN documents d ON d.id = cd.document_id
WHERE cd.document_id = %s AND c.status IN ('flagged', 'hitl_pending')
GROUP BY c.id
```

Returns list of active conflicts involving this doc.

---

## Tool: `resolve_conflict`

**Purpose**: Surface conflict to user via HITL interrupt. Pauses agent, waits for user decision, updates DB.

```python
@tool
def resolve_conflict(
    conflict_id: str,
    recommendation: str,
) -> str:
    """
    Surface a conflict to the user for resolution. Pauses execution until user approves,
    rejects, or modifies the conflict metadata. Call check_conflicts first to gather doc details.
    Only call once per run.
    """
```

**Interrupt payload**:
```python
from langgraph.types import interrupt

# Fetch full conflict + documents before interrupting
conflict = fetch_conflict_with_docs(conflict_id)  # hits DB

decision = interrupt({
    "conflict_id": conflict_id,
    "conflict_type": conflict["conflict_type"],       # duplicate | outdated | contradictory
    "recommendation": recommendation,                  # agent's suggested action + reason
    "documents": [
        {
            "id": doc["id"],
            "title": doc["title"],
            "created_at": doc["created_at"],
        }
        for doc in conflict["documents"]
    ],
})
```

**Resume payload** (from frontend):
```json
{
  "action": "approve | reject | modify",
  "preferred_document_id": "optional — which doc wins",
  "notes": "optional user comment"
}
```

**Post-resume DB updates**:
- `action = approve` → set `conflicts.status = 'resolved'`, set `preferred_document_id`, store notes in `resolution_notes`
- `action = reject` → set `conflicts.status = 'dismissed'`, store notes in `resolution_notes`
- `action = modify` → set `conflicts.status = 'resolved'`, update `preferred_document_id`, store notes in `resolution_notes`

---

## DB module: `backend/app/db/conflicts.py`

New functions needed:
- `fetch_conflict_with_docs(conflict_id) -> dict` — full conflict + all involved docs (id, title, created_at)
- `resolve_conflict_db(conflict_id, action, preferred_doc_id, notes, user_id)` — applies decision to DB
- `fetch_document_conflicts(document_id) -> list[dict]` — all open conflicts for a doc (`status IN ('flagged', 'hitl_pending')`)

---

## Dependencies to install

```bash
# Already installed via existing stack — no new deps for Phase 1
```

---

## Notes

- All DB functions user-scoped — always validate `user_id` from JWT
- `search_chunks` requires embedding the query — reuses `get_embeddings()` from `model_provider.py`
- `resolve_conflict` must be called max once per run — enforced by system prompt guidance
- No `role` field on documents in conflict payload — frontend shows all docs without labels, user picks preferred
- No `conflict_history` table — all resolution notes stored in `conflicts.resolution_notes`
