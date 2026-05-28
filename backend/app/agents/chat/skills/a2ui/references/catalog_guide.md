# A2UI Basic Catalog — Component Reference

This is the prop reference for the 11 components implemented in this app.
Source: A2UI v0.9 basic catalog specification.

---

## Text

Displays text content with optional markdown rendering.

| Prop | Type | Required | Description |
|---|---|---|---|
| `id` | string | yes | Unique node ID |
| `component` | `"Text"` | yes | |
| `text` | string or `{"path": "/key"}` | yes | Text content. Supports markdown. |
| `variant` | `"h1"` \| `"h2"` \| `"h3"` \| `"h4"` \| `"h5"` \| `"body"` \| `"caption"` | no | Default: `"body"` |

Text content is rendered via Markdown. Use `$...$` for inline math, `$$...$$` for display math.

---

## Image

Displays an image from a URL.

| Prop | Type | Required | Description |
|---|---|---|---|
| `id` | string | yes | |
| `component` | `"Image"` | yes | |
| `url` | string or `{"path": "/key"}` | yes | Image URL |
| `description` | string or `{"path": "/key"}` | no | Alt text |
| `variant` | `"icon"` \| `"avatar"` \| `"smallFeature"` \| `"mediumFeature"` \| `"largeFeature"` \| `"header"` | no | Default: `"mediumFeature"` |
| `fit` | `"contain"` \| `"cover"` \| `"fill"` \| `"none"` \| `"scaleDown"` | no | Default: `"fill"` |

---

## Icon

Displays a Material Symbols icon or emoji.

| Prop | Type | Required | Description |
|---|---|---|---|
| `id` | string | yes | |
| `component` | `"Icon"` | yes | |
| `name` | string or `{"path": "/key"}` | yes | Material Symbol name (snake_case) or emoji |

Common names: `check_circle`, `warning`, `info`, `trending_up`, `description`,
`compare_arrows`, `library_books`, `topic`, `search`, `close`, `done`, `arrow_upward`,
`arrow_downward`, `document_scanner`, `schedule`, `person`, `format_quote`

---

## Row

Horizontal layout container.

| Prop | Type | Required | Description |
|---|---|---|---|
| `id` | string | yes | |
| `component` | `"Row"` | yes | |
| `children` | list of string IDs | yes | Child node IDs |
| `justify` | `"start"` \| `"center"` \| `"end"` \| `"spaceBetween"` \| `"spaceAround"` | no | Main-axis alignment. Default: `"start"` |
| `align` | `"start"` \| `"center"` \| `"end"` \| `"stretch"` | no | Cross-axis alignment. Default: `"start"` |

---

## Column

Vertical layout container.

| Prop | Type | Required | Description |
|---|---|---|---|
| `id` | string | yes | |
| `component` | `"Column"` | yes | |
| `children` | list of string IDs | yes | Child node IDs |
| `justify` | `"start"` \| `"center"` \| `"end"` \| `"spaceBetween"` \| `"spaceAround"` | no | Default: `"start"` |
| `align` | `"start"` \| `"center"` \| `"end"` \| `"stretch"` | no | Default: `"stretch"` |

---

## List

Scrollable list of repeated items.

| Prop | Type | Required | Description |
|---|---|---|---|
| `id` | string | yes | |
| `component` | `"List"` | yes | |
| `children` | list of string IDs | yes | Each child is a list item |
| `orientation` | `"vertical"` \| `"horizontal"` | no | Default: `"vertical"` |

---

## Card

Container with visual card styling (background, border-radius, shadow).

| Prop | Type | Required | Description |
|---|---|---|---|
| `id` | string | yes | |
| `component` | `"Card"` | yes | |
| `child` | string ID | yes | Single child node (usually a Column) |

---

## Tabs

Tabbed layout. Each tab shows one child panel.

| Prop | Type | Required | Description |
|---|---|---|---|
| `id` | string | yes | |
| `component` | `"Tabs"` | yes | |
| `tabs` | list of `{"label": string, "child": string}` | yes | Tab definitions |

Each `child` string is the ID of the panel node to show for that tab.
The panel nodes must also exist in the component list.

---

## Divider

Horizontal rule. No children or data props.

| Prop | Type | Required | Description |
|---|---|---|---|
| `id` | string | yes | |
| `component` | `"Divider"` | yes | |

---

## Button

Clickable button. In display-only surfaces, serves as a visual affordance.

| Prop | Type | Required | Description |
|---|---|---|---|
| `id` | string | yes | |
| `component` | `"Button"` | yes | |
| `label` | string or `{"path": "/key"}` | yes | Button text |
| `variant` | `"filled"` \| `"outlined"` \| `"text"` | no | Default: `"filled"` |
| `disabled` | boolean or `{"path": "/key"}` | no | Default: `false` |

---

## CheckBox

Toggle with a label. For display-only use, set `checked` from data_model.

| Prop | Type | Required | Description |
|---|---|---|---|
| `id` | string | yes | |
| `component` | `"CheckBox"` | yes | |
| `label` | string or `{"path": "/key"}` | yes | Display label |
| `checked` | boolean or `{"path": "/key"}` | no | Default: `false` |
