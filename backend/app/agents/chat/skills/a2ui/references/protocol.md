# A2UI v0.9 Protocol — Adjacency List Format

## Component tree structure

A2UI describes UI as a **flat list** of component nodes. Nodes reference each other by ID,
forming a tree. This is called an adjacency list.

```json
[
  {"id": "root",    "component": "Card",   "child": "col"},
  {"id": "col",     "component": "Column", "children": ["header", "body"]},
  {"id": "header",  "component": "Text",   "text": "Hello", "variant": "h2"},
  {"id": "body",    "component": "Text",   "text": {"path": "/content"}, "variant": "body"}
]
```

## Rules

### Required fields on every node
- `id` — unique string identifier within this surface
- `component` — one of the 18 basic catalog names (exact spelling, case-sensitive)

### Children
- `child` — single string (the child's id) — use for components that accept one child
- `children` — list of strings (children ids) — use for layout containers (Column, Row, List, Tabs)
- Some components (Text, Icon, Divider, Button, CheckBox, Image) have no children

### Root node
- One node must have `id: "root"` — the renderer starts from here
- Root is almost always a `Card`

### Literal vs dynamic values

**Literal** — static string, written directly:
```json
{"id": "lbl", "component": "Text", "text": "Documents"}
```

**Dynamic** — bound to a value in `data_model` via JSON Pointer path:
```json
{"id": "title", "component": "Text", "text": {"path": "/docTitle"}}
```

The path `/docTitle` resolves to `data_model["docTitle"]`.
Nested keys use `/a/b/c` syntax — `data_model["a"]["b"]["c"]`.

## data_model

A dict of values the component tree references via path bindings.

```python
data_model = {
    "docTitle": "Attention Is All You Need",
    "author": {
        "name": "Vaswani et al.",
        "year": 2017
    }
}
```

Reference with `{"path": "/docTitle"}` or `{"path": "/author/name"}`.

Put all display data here. Keep the component tree structural (layout + binding only).

## Text variant values

| Variant | Rendered as |
|---|---|
| `h1` | Largest heading |
| `h2` | Second heading |
| `h3` | Third heading |
| `h4` | Fourth heading |
| `h5` | Smallest heading |
| `body` | Standard paragraph text (default) |
| `caption` | Small muted label text |

## Row / Column alignment

```json
{"id": "row", "component": "Row", "justify": "spaceBetween", "align": "center"}
```

`justify` — main-axis alignment: `start`, `center`, `end`, `spaceBetween`, `spaceAround`
`align` — cross-axis alignment: `start`, `center`, `end`, `stretch`

## Icon

The `name` field accepts a Material Symbols name (snake_case) or an emoji:

```json
{"id": "icon", "component": "Icon", "name": "check_circle"}
{"id": "icon", "component": "Icon", "name": "⚠️"}
```

Common Material Symbol names: `check_circle`, `warning`, `info`, `trending_up`,
`arrow_upward`, `arrow_downward`, `document_scanner`, `topic`, `description`,
`compare_arrows`, `library_books`, `search`, `close`, `done`, `format_quote`, `schedule`

## Button

```json
{
  "id": "btn",
  "component": "Button",
  "label": "Open document",
  "variant": "outlined"
}
```

`variant`: `filled` (default), `outlined`, `text`

## Image

```json
{
  "id": "img",
  "component": "Image",
  "url": {"path": "/thumbnailUrl"},
  "variant": "mediumFeature",
  "fit": "cover"
}
```

`variant`: `icon`, `avatar`, `smallFeature`, `mediumFeature`, `largeFeature`, `header`
`fit`: `contain`, `cover`, `fill`, `none`, `scaleDown`

## List

```json
{"id": "list", "component": "List", "children": ["item1", "item2", "item3"]}
```

Each child is rendered as a list item. Orientation defaults to vertical.

## Tabs

```json
{
  "id": "tabs",
  "component": "Tabs",
  "tabs": [
    {"label": "Summary",   "child": "summary-col"},
    {"label": "Evidence",  "child": "evidence-col"}
  ]
}
```

Each tab has a `label` (string) and a `child` (id of the content node).

## Divider

```json
{"id": "div", "component": "Divider"}
```

No additional props needed.

## CheckBox

```json
{
  "id": "cb1",
  "component": "CheckBox",
  "label": "Select this document",
  "checked": {"path": "/selected"}
}
```
