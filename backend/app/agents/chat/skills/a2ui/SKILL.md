---
name: a2ui
description: >
  Renders rich visual UI surfaces inline in the chat panel using the A2UI v0.9
  basic catalog of primitive components (Text, Row, Column, Card, List, Icon, etc.).
  Use this skill whenever the main agent has data that benefits from visual layout —
  document summaries, source quotes, comparisons, topic clusters, status overviews,
  material lists/tables.
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

## All 18 components

| Component | Use for |
|---|---|
| `Card` | Outer container — always the root |
| `Column` | Vertical stack |
| `Row` | Horizontal layout |
| `List` | Repeated items — static or data-driven template |
| `Tabs` | Multiple views in one surface |
| `Modal` | Overlay dialog (trigger + content) |
| `Divider` | Horizontal/vertical rule separator |
| `Text` | All text — variants: h1 h2 h3 h4 h5 body caption |
| `Icon` | Material Symbol icon name |
| `Image` | URL-based image |
| `Video` | URL-based video player |
| `AudioPlayer` | URL-based audio player |
| `Button` | Clickable — `child` is its label component |
| `TextField` | Text input field |
| `CheckBox` | Boolean toggle — uses `value` prop |
| `ChoicePicker` | Single/multi select from options list |
| `Slider` | Numeric range slider |
| `DateTimeInput` | Date and/or time picker |

Full prop reference: **references/catalog_guide.md**
Complete examples: **references/examples.md**
Adjacency list rules + weight + template: **references/protocol.md**

---

## NO-GO: things that don't exist

**`Table` does not exist.** `Grid` does not exist.

For tabular data, use a header `Row` + data `List` with template children:

```python
render_ui(
    components=[
        {"id": "root",     "component": "Card",   "child": "col"},
        {"id": "col",      "component": "Column", "children": ["hdr", "divider", "rows"]},
        # Header row
        {"id": "hdr",      "component": "Row",    "children": ["h-name", "h-type", "h-status"]},
        {"id": "h-name",   "component": "Text",   "text": "Name",   "variant": "caption", "weight": 2},
        {"id": "h-type",   "component": "Text",   "text": "Type",   "variant": "caption", "weight": 1},
        {"id": "h-status", "component": "Text",   "text": "Status", "variant": "caption", "weight": 1},
        {"id": "divider",  "component": "Divider"},
        # Data rows via template
        {"id": "rows",     "component": "List",   "children": {"componentId": "row-tmpl", "path": "/items"}},
        {"id": "row-tmpl", "component": "Row",    "children": ["r-name", "r-type", "r-status"]},
        {"id": "r-name",   "component": "Text",   "text": {"path": "name"},   "variant": "body",    "weight": 2},
        {"id": "r-type",   "component": "Text",   "text": {"path": "type"},   "variant": "caption", "weight": 1},
        {"id": "r-status", "component": "Text",   "text": {"path": "status"}, "variant": "caption", "weight": 1},
    ],
    data_model={
        "items": [
            {"name": "BERT Paper", "type": "pdf", "status": "ready"},
            {"name": "ViT Paper",  "type": "pdf", "status": "ready"},
        ]
    }
)
```

**GFM pipe tables do NOT render in Text.** `| col | col |` shows as raw `|` characters.
Put tabular data in `data_model` as a list and use the template pattern above.

**Math / KaTeX not supported.** `$...$` renders as literal characters.

---

## Key prop gotchas

| Prop | Wrong | Right |
|---|---|---|
| Tabs tab label | `"label": "Summary"` | `"title": "Summary"` |
| List direction | `"orientation": "horizontal"` | `"direction": "horizontal"` |
| CheckBox state | `"checked": true` | `"value": true` |
| Button content | `"label": "Click"` | `"child": "btn-lbl"` (Text node ID) |
| Modal open | `"open": true, "child": "..."` | `"trigger": "btn-id", "content": "panel-id"` |

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
| `unknown component 'X'` | Check spelling against the 18-component table above |
| `missing 'id'` | Every node needs an `id` string |
| `no node with id='root'` | Add/rename your root node |
| Any other validation error | Read the error, fix the named field, retry once |

Max 3 retries. If still failing after 3, return the error string to the main agent.
