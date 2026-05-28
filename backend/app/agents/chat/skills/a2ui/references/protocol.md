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
- `component` — one of the 18 basic catalog names (exact spelling, case-sensitive):
  `Text`, `Image`, `Icon`, `Video`, `AudioPlayer`, `Row`, `Column`, `List`, `Card`, `Tabs`,
  `Modal`, `Divider`, `Button`, `TextField`, `CheckBox`, `ChoicePicker`, `Slider`, `DateTimeInput`

### Children
- `child` — single string (the child's id) — Card, Modal (trigger/content), Button
- `children` — list of strings — Row, Column, List (when static)
- Leaf components (Text, Icon, Divider, Image, Video, AudioPlayer, Button, TextField, CheckBox, ChoicePicker, Slider, DateTimeInput) have no children of their own

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

**Relative path** (inside List templates) — no leading `/`:
```json
{"id": "name", "component": "Text", "text": {"path": "name"}}
```
Resolves to `current_item["name"]` within the template loop.

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

## weight prop

Any component can have a `weight` number — this is flex-grow, applied when the component
is a direct child of a Row or Column. Use it to create proportional columns:

```python
{"id": "col-name",   "component": "Text", "text": "Name",   "variant": "caption", "weight": 2},
{"id": "col-status", "component": "Text", "text": "Status", "variant": "caption", "weight": 1},
```
`col-name` takes 2/3 of the space, `col-status` takes 1/3.

## Text variants

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

`justify` — main-axis: `start`, `center`, `end`, `spaceBetween`, `spaceAround`, `spaceEvenly`, `stretch`
`align` — cross-axis: `start`, `center`, `end`, `stretch`

## Icon

The `name` field accepts camelCase icon names (converted to snake_case Material Symbol internally).
Any snake_case Material Symbol name also works directly.

```json
{"id": "icon", "component": "Icon", "name": "check"}
{"id": "icon", "component": "Icon", "name": "arrowBack"}
{"id": "icon", "component": "Icon", "name": "check_circle"}
```

## List — static children

```json
{"id": "list", "component": "List", "children": ["item1", "item2", "item3"]}
```

`direction`: `vertical` (default) or `horizontal`

## List — template children (data-driven)

Renders one copy of the template component per item in the data array.
Within the template, use relative paths (no `/` prefix) to access item fields.

```python
{"id": "doc-list", "component": "List", "children": {"componentId": "doc-row", "path": "/docs"}},
{"id": "doc-row",  "component": "Row",  "children": ["r-name", "r-status"], "align": "center"},
{"id": "r-name",   "component": "Text", "text": {"path": "name"},   "variant": "body",    "weight": 2},
{"id": "r-status", "component": "Text", "text": {"path": "status"}, "variant": "caption", "weight": 1},
# data_model: {"docs": [{"name": "BERT", "status": "ready"}, ...]}
```

## Tabs

`tabs` is a list of objects with `title` (string) and `child` (component ID):

```json
{
  "id": "tabs",
  "component": "Tabs",
  "tabs": [
    {"title": "Summary",   "child": "summary-col"},
    {"title": "Evidence",  "child": "evidence-col"}
  ]
}
```

## Modal

Needs a `trigger` (component ID that opens the modal) and `content` (component ID shown inside):

```json
{"id": "modal",     "component": "Modal",  "trigger": "open-btn", "content": "modal-body"},
{"id": "open-btn",  "component": "Button", "child": "btn-lbl"},
{"id": "btn-lbl",   "component": "Text",   "text": "Details", "variant": "body"},
{"id": "modal-body","component": "Text",   "text": {"path": "/details"}, "variant": "body"}
```

## Button

Button renders its `child` component as the label. `action` is optional for display-only surfaces:

```json
{
  "id": "btn",
  "component": "Button",
  "child": "btn-lbl",
  "variant": "primary"
}
```

`variant`: `default` (default), `primary`, `borderless`

## CheckBox

`value` (boolean or path) controls checked state — use `value`, NOT `checked`:

```json
{
  "id": "cb1",
  "component": "CheckBox",
  "label": "Select this document",
  "value": {"path": "/selected"}
}
```

## Divider

`axis` optional — `"horizontal"` (default) or `"vertical"`:

```json
{"id": "div", "component": "Divider"}
{"id": "vdiv", "component": "Divider", "axis": "vertical"}
```
