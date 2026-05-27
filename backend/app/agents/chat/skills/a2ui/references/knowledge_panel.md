# KnowledgePanel

Synthesised multi-source answer with visible citations. Use when the main agent has pulled relevant context from several documents and wants to present a structured answer with attributions the user can follow.

## Schema

```python
{
  "query": str,          # the user's original question
  "answer_md": str,      # synthesised answer in markdown
  "sources": list[{
    "title": str,        # document title
    "snippet": str,      # the supporting passage (1–2 sentences)
    "doc_id": str,       # UUID from the documents table
  }],
}
```

## Example

```json
{
  "component": "KnowledgePanel",
  "data": {
    "query": "How do transformers handle positional information?",
    "answer_md": "Transformers have no built-in sequence order awareness, so position is injected via **positional encodings** added to token embeddings before the first attention layer.\n\nThe original paper uses sine/cosine functions at different frequencies. Later work (RoPE, ALiBi) introduced learned and relative encodings that generalise better to longer sequences.",
    "sources": [
      {
        "title": "Attention Is All You Need",
        "snippet": "We use sine and cosine functions of different frequencies to produce positional encodings.",
        "doc_id": "d1a2b3c4-e5f6-7890-abcd-ef1234567890"
      },
      {
        "title": "RoPE: Rotary Position Embedding",
        "snippet": "Rotary position embedding encodes absolute position with a rotation matrix applied in the attention computation.",
        "doc_id": "e5f6a7b8-9012-3456-bcde-f12345678901"
      }
    ]
  }
}
```

## Field tips

- **`query`** — use the user's actual question, not a reformulation. Anchors the card to the conversation.
- **`answer_md`** — the main agent's synthesised answer in markdown. Bold key terms. Use paragraphs to separate ideas. This is not an excerpt — it's a composed answer.
- **`sources`** — the chunks that actually supported the answer. Keep `snippet` short (1–2 sentences, verbatim from `search_chunks`). Include only sources that contributed to `answer_md` — don't pad with loosely related docs.

## Common mistakes

- Putting the full wiki page in `answer_md` → use `WikiCard` for that. `KnowledgePanel` is for synthesised answers, not raw content.
- Including sources that weren't actually used in the answer → misleads the user about what supported the claim.
- `snippet` longer than 2–3 sentences → clutters the card. Keep citations tight.
