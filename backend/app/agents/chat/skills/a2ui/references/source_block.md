# SourceBlock

A raw source passage with provenance. Use when the user asks for an exact quote, wants to see the evidence behind a claim, or requests a specific section from a document.

## Schema

```python
{
  "doc_title": str,              # human-readable document title
  "excerpt": str,                # verbatim chunk text
  "doc_id": str,                 # UUID from the documents table
  "page_ref": str | None,        # section/page reference (optional)
  "relevance_score": float | None,  # 0.0–1.0 similarity score (optional)
}
```

## Example

```json
{
  "component": "SourceBlock",
  "data": {
    "doc_title": "Attention Is All You Need",
    "excerpt": "We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely.",
    "doc_id": "d1a2b3c4-e5f6-7890-abcd-ef1234567890",
    "page_ref": "§ 1 — Introduction",
    "relevance_score": 0.94
  }
}
```

## Field tips

- **`excerpt`** — must be verbatim text from `search_chunks`. Never paraphrase; the card is meant to show raw evidence.
- **`page_ref`** — include the section name or page number if available from the chunk metadata. Helps the user locate the passage. Omit if unknown.
- **`relevance_score`** — the cosine similarity from vector search, if available. Shows the user how closely the passage matched the query. Omit if not from a similarity search.

## Common mistakes

- Paraphrasing the excerpt → defeats the purpose; user can't verify the source claim.
- Rendering multiple quotes as separate SourceBlocks when a KnowledgePanel would be clearer → use `KnowledgePanel` when the answer synthesises across sources.
