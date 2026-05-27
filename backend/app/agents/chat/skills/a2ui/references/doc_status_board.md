# DocStatusBoard

Library overview with processing states. Use when the user asks what files have been uploaded, what's ready to query, what's still processing, or what failed.

## Schema

```python
{
  "docs": list[{
    "title": str,          # document title
    "status": str,         # exact status string (see values below)
    "file_type": str,      # file extension type
    "topics": list[str],   # stored topics (empty list ok)
  }],
}
```

## Status values

| Status | Meaning |
|---|---|
| `uploading` | Frontend upload in progress |
| `uploaded` | In DB, ingestion not started |
| `extracting` | Text extraction in progress |
| `chunking` | Splitting into chunks |
| `embedding` | Generating vector embeddings |
| `generating_wiki` | Agent writing the wiki page |
| `indexing` | Building index entries |
| `conflict_scan` | Checking for conflicts |
| `ready` | Fully processed, queryable |
| `failed_extraction` | Extraction step failed |
| `failed_embedding` | Embedding step failed |
| `failed_wiki` | Wiki generation failed |
| `failed_indexing` | Indexing step failed |
| `failed` | General failure |

## Example

```json
{
  "component": "DocStatusBoard",
  "data": {
    "docs": [
      {
        "title": "Attention Is All You Need",
        "status": "ready",
        "file_type": "pdf",
        "topics": ["transformers", "NLP", "self-attention"]
      },
      {
        "title": "My Lecture Slides",
        "status": "generating_wiki",
        "file_type": "pptx",
        "topics": []
      },
      {
        "title": "Research Notes Q1",
        "status": "failed_embedding",
        "file_type": "md",
        "topics": []
      }
    ]
  }
}
```

## Field tips

- **`status`** — use exact strings from the table above. Copy from `list_docs` results; don't guess or invent variants.
- **`topics`** — empty list `[]` is valid for documents still processing (topics are set during indexing). Don't omit the field.
- **`file_type`** — use the `file_type` value from the documents record: `"pdf"`, `"md"`, `"txt"`, `"pptx"`, `"img"`.

## Common mistakes

- Inventing status strings like `"processing"` or `"complete"` → validation error. Use exact values from the table.
- Omitting documents that are failed → the board should show the full picture, not just happy-path docs. Failed states are useful to the user.
