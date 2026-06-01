# Document Ingestion — Implementation Plan

## Decisions Summary

| Decision | Choice |
|---|---|
| Agent approach | Full deepagents harness (write_todos, planning) |
| Checkpointer | None (fire-and-forget) |
| AG-UI | Not needed — status via Supabase Realtime |
| Extraction | PyMuPDF + python-pptx + multimodal LLM for images |
| Chunking | RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200) |
| Embeddings | OpenAI text-embedding-3-small → vector(1536) |
| model_provider.py | LLM + embeddings both here; OpenAI default, Gemini ready |
| Error handling | ToolRetryMiddleware on network tools; agent calls update_status(failed_*) |
| Wiki structure | Fixed markdown sections |
| API shape | POST /documents/presign → POST /documents/confirm |

---

## File Structure

```
backend/
  app/
    agents/
      docs_ingestion/
        __init__.py
        agent.py              # build_document_processor_agent()
        tools/
          __init__.py
          extract.py          # extract_text(document_id) -> str
          chunking.py         # chunk_and_embed(document_id, text) -> int
                              # read_chunks_batch(document_id, offset, limit) -> list[str]
          wiki.py             # save_wiki(document_id, wiki_content) -> str
          index.py            # save_index(document_id, summary, topics) -> str
          status.py           # update_status(document_id, status) -> str
    services/
      ingestion.py            # run_ingestion() → invokes agent (called by BackgroundTask)
    api/
      documents.py            # POST /documents/presign, POST /documents/confirm
    utils/
      model_provider.py       # get_chat_model(), get_embedding_model()
    db/
      db.py                   # existing
      storage.py              # existing
```

---

## API Endpoints

### POST /documents/presign
```
Request:  { filename: str, file_type: str, title: str }
Response: { document_id: str, presigned_url: str }
Side effects:
  - INSERT into documents (status="uploaded")
  - Generate Supabase Storage presigned URL
```

### POST /documents/confirm
```
Request:  { document_id: str }
Response: { ok: true }
Side effects:
  - Verify document row exists + status="uploaded"
  - Add run_ingestion(document_id) to BackgroundTasks
```

---

## Agent Tools

### extract_text(document_id: str) -> str
- Download raw file from Supabase Storage via storage_path
- Detect file type via `filetype` lib (not extension)
- PDF → PyMuPDF: extract text per page + embedded images → multimodal LLM for images → append visual notes inline
- PPTX → python-pptx: extract text per slide + images → same image handling
- MD/TXT → stdlib read
- Image file → entire file to multimodal LLM → description as text
- Unsupported → call update_status(id, "unsupported"), raise
- ToolRetryMiddleware handles transient Storage download failures

### chunk_and_embed(document_id: str, text: str) -> int
- RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
- Embed each chunk via get_embedding_model()
- Batch INSERT into chunks table (content, embedding, chunk_index, document_id)
- Returns chunk count (int) — agent uses this to plan batched wiki reads
- ToolRetryMiddleware handles transient embedding API failures

### read_chunks_batch(document_id: str, offset: int, limit: int) -> list[str]
- SELECT content FROM chunks WHERE document_id=? ORDER BY chunk_index LIMIT ? OFFSET ?
- Returns list of chunk text strings
- Agent calls iteratively; uses write_todos to track batch progress

### save_wiki(document_id: str, wiki_content: str) -> str
- UPDATE documents SET wiki_page=? WHERE id=?
- Returns "ok"

### save_index(document_id: str, summary: str, topics: list[str]) -> str
- UPDATE documents SET summary=?, topics=? WHERE id=?
- Returns "ok"

### update_status(document_id: str, status: str) -> str
- UPDATE documents SET status=?, updated_at=now() WHERE id=?
- Valid statuses: uploaded | extracting | chunking | embedding | generating_wiki | indexing | conflict_scan | ready | failed_extraction | failed_embedding | failed_wiki | failed_indexing | unsupported
- Returns "ok"

---

## Agent Flow (system prompt instructs this)

```
1. write_todos: [extract, chunk_embed, wiki_gen, index_gen, mark_ready]

2. update_status(id, "extracting")
3. text = extract_text(id)

4. update_status(id, "chunking")
   update_status(id, "embedding")
5. chunk_count = chunk_and_embed(id, text)

6. update_status(id, "generating_wiki")
7. [batched] for offset in range(0, chunk_count, 20):
     chunks = read_chunks_batch(id, offset, 20)
     [accumulate understanding]
8. save_wiki(id, <generated wiki>)

9. update_status(id, "indexing")
10. save_index(id, <summary>, <topics[]>)

11. update_status(id, "conflict_scan")
    update_status(id, "ready")
```

**On tool failure:** agent calls update_status(id, failed_*) matching the failed step, then stops.

| Failed tool | Status set |
|---|---|
| extract_text | failed_extraction |
| chunk_and_embed | failed_embedding |
| save_wiki | failed_wiki |
| save_index | failed_indexing |

---

## Wiki Page Structure (fixed sections)

```markdown
## Summary
2-3 sentence overview of the document.

## Key Concepts
- Concept 1: explanation
- Concept 2: explanation

## Entities
People, organizations, systems, terms mentioned.

## Important Facts
Bullet list of critical facts, figures, dates.

## Retrieval Hints
Keywords and phrases a user might query to find this document.
```

---

## model_provider.py

```python
from langchain.chat_models import init_chat_model
from langchain_openai import OpenAIEmbeddings
# from langchain_google_genai import GoogleGenerativeAIEmbeddings  # 768 dims, needs migration

def get_chat_model():
    return init_chat_model("openai:gpt-4o-mini")
    # return init_chat_model("google_genai:gemini-2.0-flash")

def get_embedding_model():
    return OpenAIEmbeddings(model="text-embedding-3-small")  # 1536 dims
    # return GoogleGenerativeAIEmbeddings(model="models/text-embedding-004")  # 768 dims
```

---

## Middleware Config

```python
from langchain.agents.middleware import ModelRetryMiddleware, ToolRetryMiddleware

middleware = [
    ModelRetryMiddleware(max_retries=3, backoff_factor=2.0, initial_delay=1.0),
    ToolRetryMiddleware(
        max_retries=2,
        tools=["extract_text", "chunk_and_embed"],
        retry_on=(TimeoutError, ConnectionError),
    ),
]
```

---

## Dependencies to Add (uv add)

```
pymupdf
python-pptx
langchain-openai
langchain-google-genai
langchain-text-splitters
deepagents
asyncpg
```

---

## DB — No Schema Changes Needed

Existing `documents` table already has: `wiki_page`, `summary`, `topics[]`, `status`, `storage_path`.
Existing `chunks` table already has: `content`, `embedding vector(1536)`, `chunk_index`, `document_id`.

pgvector extension must be enabled on Supabase project (verify before implementing).

---

## Out of Scope (this feature)

- Conflict detection (Resolver agent, separate feature)
- Main agent retrieval
- Frontend upload UI
- RLS policies (infra task)
