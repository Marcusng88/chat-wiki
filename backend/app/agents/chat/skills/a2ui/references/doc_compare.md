# DocCompare

Side-by-side comparison of documents on a specific topic. Use when the user wants to contrast how different documents treat the same subject, when sources disagree, or when multiple perspectives are relevant.

## Schema

```python
{
  "topic": str,        # the comparison axis (what is being compared)
  "entries": list[{
    "doc_id": str,     # UUID from the documents table
    "title": str,      # document title
    "excerpt": str,    # the relevant passage from this document on the topic
    "role": Literal["current", "outdated", "conflicting"],
  }],
}
```

## Example

```json
{
  "component": "DocCompare",
  "data": {
    "topic": "learning rate scheduling",
    "entries": [
      {
        "doc_id": "d1a2b3c4-...",
        "title": "AdamW Paper (2024)",
        "excerpt": "We apply cosine annealing with warm restarts, reducing LR by 10× over 100k steps.",
        "role": "current"
      },
      {
        "doc_id": "e5f6a7b8-...",
        "title": "Original Adam Paper (2015)",
        "excerpt": "A fixed learning rate of 0.001 performed well across all tested tasks.",
        "role": "outdated"
      },
      {
        "doc_id": "c9d0e1f2-...",
        "title": "Internal Training Notes (2023)",
        "excerpt": "Warmup to peak LR then linear decay — cosine made convergence unstable in our setup.",
        "role": "conflicting"
      }
    ]
  }
}
```

## Role values

| Role | Meaning |
|---|---|
| `"current"` | Most up-to-date or authoritative source on this topic |
| `"outdated"` | Superseded by newer evidence or a more recent document |
| `"conflicting"` | Contradicts another entry without one being clearly right |

## Field tips

- **`topic`** — be specific. "learning rate scheduling" is better than "training". The topic label anchors the whole comparison.
- **`entries`** — minimum 2. More than 4 entries gets cluttered; prefer the most relevant sources.
- **`role`** — assign based on document dates and conflict analysis, not arbitrarily. When two sources simply differ without a clear "right answer", both get `"conflicting"`.
- **`excerpt`** — a targeted passage on the topic, not the full document. 1–3 sentences works best.

## Common mistakes

- Assigning all entries `"current"` → loses the comparison signal. At least one document in a temporal comparison should be `"outdated"`.
- Using `DocCompare` for a single document → use `WikiCard` instead. DocCompare needs ≥2 entries to be meaningful.
