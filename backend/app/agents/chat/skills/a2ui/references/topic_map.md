# TopicMap

Subject cluster across the knowledge base. Use when the user asks what's in the library, what topics are covered, or wants a high-level overview of available material.

## Schema

```python
{
  "topics": list[{
    "label": str,         # topic name
    "doc_count": int,     # number of documents with this topic
    "docs": list[str],    # doc UUIDs that carry this topic
  }],
  "highlighted_topic": str | None,  # topic to emphasise (optional)
}
```

## Example

```json
{
  "component": "TopicMap",
  "data": {
    "topics": [
      {
        "label": "transformers",
        "doc_count": 5,
        "docs": ["d1a2b3c4-...", "e5f6a7b8-..."]
      },
      {
        "label": "reinforcement learning",
        "doc_count": 3,
        "docs": ["c9d0e1f2-..."]
      },
      {
        "label": "computer vision",
        "doc_count": 2,
        "docs": ["a3b4c5d6-..."]
      }
    ],
    "highlighted_topic": "transformers"
  }
}
```

## Field tips

- **`topics`** — populate from `list_docs` results. Collect the `topics` array from each document and aggregate: count how many docs carry each label, collect their IDs.
- **`doc_count`** — must equal `len(docs)`. Don't guess; count from the actual results.
- **`docs`** — include actual UUIDs. The frontend uses these for navigation.
- **`highlighted_topic`** — use this when the user's query is about a specific subject. Set to the topic most relevant to their question. Omit if the query is general ("what's in my library").

## Common mistakes

- Inventing topic labels not present in the documents → misleads the user. Only use topics stored in the `topics[]` column.
- Omitting `docs` list → breaks navigation. Always populate it from real document IDs.
- Setting `doc_count` ≠ `len(docs)` → inconsistent card. They must match.
