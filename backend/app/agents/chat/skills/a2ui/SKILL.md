---
name: a2ui
description: >
  Renders rich visual UI surfaces inline in the chat panel using the A2UI v0.9
  basic catalog of primitive components (Text, Row, Column, Card, Icon, Button, etc.).
  Use this skill whenever the main agent has data that benefits from visual layout —
  document summaries, source quotes, comparisons, topic clusters, status overviews.
  Also use when the user says "show", "visualize", "give me a card", or "compare".
---

# A2UI UI Renderer

You compose UI from primitives and call `render_ui(components, data_model)` once.
Return `rendered` after success.

---

## Four-step flow

1. **Read references/examples.md** — find the closest example to your task and adapt it
2. **Build the component tree** — flat adjacency list, root node first
3. **Build the data_model** — all display values go here; reference via `{"path": "/key"}`
4. **Call `render_ui(components, data_model)`** — then return `rendered`

---

## render_ui signature

```python
render_ui(
    components: list[dict],   # flat adjacency list — see protocol.md
    data_model: dict          # values referenced by path bindings
) -> str                      # "rendered (surface s-xxxxxxxx)" or validation error
```

---

## Component quick reference

| Component | Use for |
|---|---|
| `Card` | Outer container — always the root |
| `Column` | Vertical stack |
| `Row` | Horizontal layout |
| `List` | Repeated items (e.g. source list, doc list) |
| `Tabs` | Multiple views in one surface |
| `Divider` | Horizontal rule separator |
| `Text` | All text — variants: h1 h2 h3 h4 h5 body caption |
| `Icon` | Material Symbol name or emoji string |
| `Image` | URL-based image |
| `Button` | Clickable action |
| `CheckBox` | Toggleable item |

Full prop reference: **references/catalog_guide.md**
Complete examples: **references/examples.md**
Adjacency list rules: **references/protocol.md**

---

## Quick example — document summary

```python
render_ui(
    components=[
        {"id": "root",    "component": "Card",   "child": "col"},
        {"id": "col",     "component": "Column", "children": ["title", "date", "div", "body", "topics"]},
        {"id": "title",   "component": "Text",   "text": {"path": "/title"},   "variant": "h2"},
        {"id": "date",    "component": "Text",   "text": {"path": "/date"},    "variant": "caption"},
        {"id": "div",     "component": "Divider"},
        {"id": "body",    "component": "Text",   "text": {"path": "/content"}, "variant": "body"},
        {"id": "topics",  "component": "Row",    "children": ["t1", "t2", "t3"]},
        {"id": "t1",      "component": "Text",   "text": {"path": "/topic0"},  "variant": "caption"},
        {"id": "t2",      "component": "Text",   "text": {"path": "/topic1"},  "variant": "caption"},
        {"id": "t3",      "component": "Text",   "text": {"path": "/topic2"},  "variant": "caption"},
    ],
    data_model={
        "title": "Attention Is All You Need",
        "date": "2017-06-12",
        "content": "This paper introduces the Transformer...",
        "topic0": "transformers",
        "topic1": "attention",
        "topic2": "NLP",
    }
)
```

---

## Error handling

| Error | Action |
|---|---|
| `unknown component 'X'` | Check spelling against the component table above |
| `missing 'id'` | Every node needs an `id` string |
| `no node with id='root'` | Add/rename your root node |
| Any other validation error | Read the error, fix the named field, retry once |

Max 3 retries. If still failing after 3, return the error string to the main agent.
