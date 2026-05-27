# WikiCard

A document's synthesized wiki page. Use when the user asks what a document says, wants a summary, or requests the wiki view of a specific document.

## Schema

```python
{
  "title": str,           # document title
  "content": str,         # full wiki page in markdown
  "topics": list[str],    # document's stored topics array
  "doc_id": str,          # UUID from the documents table
  "created_at": str,      # ISO date string (YYYY-MM-DD)
}
```

## Example

```json
{
  "component": "WikiCard",
  "data": {
    "title": "Attention Is All You Need",
    "content": "## Overview\n\nThe Transformer replaces recurrence with self-attention...\n\n## Key Contributions\n\n- Multi-head attention mechanism\n- Positional encodings\n- Encoder-decoder architecture without RNNs",
    "topics": ["transformers", "self-attention", "NLP", "sequence modelling"],
    "doc_id": "d1a2b3c4-e5f6-7890-abcd-ef1234567890",
    "created_at": "2026-05-27"
  }
}
```

## Field tips

- **`content`** — use the wiki page markdown verbatim from `get_wiki_page`. Don't paraphrase or truncate. Headings and bullets render in the card.
- **`topics`** — copy the `topics` array from the document record exactly as stored.
- **`doc_id`** — must be the actual UUID, not a placeholder.
- **`created_at`** — use the document's `created_at` date, formatted as `YYYY-MM-DD`.

## Common mistakes

- Summarising instead of using the actual wiki content → produces a shallow card. Pass the full wiki text.
- Inventing a `doc_id` → breaks the frontend's "open document" link. Use the real ID.
