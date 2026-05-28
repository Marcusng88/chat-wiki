# A2UI Basic Catalog — Component Reference

All 18 components in the v0.9 basic catalog. Exact spelling, case-sensitive.

---

## Text

Displays text with markdown rendering.

| Prop | Type | Required | Description |
|---|---|---|---|
| `id` | string | yes | Unique node ID |
| `component` | `"Text"` | yes | |
| `text` | string or `{"path": "/key"}` | yes | Text content. Basic markdown only — see AGENTS.md for what is/isn't supported. |
| `variant` | `"h1"` \| `"h2"` \| `"h3"` \| `"h4"` \| `"h5"` \| `"body"` \| `"caption"` | no | Default: `"body"` |
| `weight` | number | no | Flex-grow within parent Row/Column (e.g. 2 = twice as wide as weight-1 siblings) |

**Do not** put GFM pipe tables or math in `text` — they render as raw characters.

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
| `fit` | `"contain"` \| `"cover"` \| `"fill"` \| `"none"` \| `"scaleDown"` | no | CSS object-fit. Default: `"fill"` |
| `weight` | number | no | Flex-grow within parent Row/Column |

---

## Icon

Displays a Material Symbols icon. Use camelCase API names — the renderer converts to snake_case automatically.

| Prop | Type | Required | Description |
|---|---|---|---|
| `id` | string | yes | |
| `component` | `"Icon"` | yes | |
| `name` | string or `{"path": "/key"}` | yes | Icon name (see below) |
| `weight` | number | no | Flex-grow within parent Row/Column |

**Supported icon names** (camelCase — renderer converts to snake_case Material Symbol):

`accountCircle`, `add`, `arrowBack`, `arrowForward`, `attachFile`, `calendarToday`, `call`,
`camera`, `check`, `close`, `delete`, `download`, `edit`, `event`, `error`, `fastForward`,
`favorite`, `favoriteOff`, `folder`, `help`, `home`, `info`, `locationOn`, `lock`, `lockOpen`,
`mail`, `menu`, `moreVert`, `moreHoriz`, `notificationsOff`, `notifications`, `pause`,
`payment`, `person`, `phone`, `photo`, `play`, `print`, `refresh`, `rewind`, `search`,
`send`, `settings`, `share`, `shoppingCart`, `skipNext`, `skipPrevious`, `star`, `starHalf`,
`starOff`, `stop`, `upload`, `visibility`, `visibilityOff`, `volumeDown`, `volumeMute`,
`volumeOff`, `volumeUp`, `warning`

Any other Material Symbol snake_case name (e.g. `"check_circle"`, `"library_books"`, `"schedule"`) also works — it renders as-is.

---

## Video

Embeds a video player.

| Prop | Type | Required | Description |
|---|---|---|---|
| `id` | string | yes | |
| `component` | `"Video"` | yes | |
| `url` | string or `{"path": "/key"}` | yes | Video URL |
| `posterUrl` | string or `{"path": "/key"}` | no | Poster image URL shown before play |
| `weight` | number | no | Flex-grow within parent Row/Column |

---

## AudioPlayer

Embeds an audio player with optional label.

| Prop | Type | Required | Description |
|---|---|---|---|
| `id` | string | yes | |
| `component` | `"AudioPlayer"` | yes | |
| `url` | string or `{"path": "/key"}` | yes | Audio URL |
| `description` | string or `{"path": "/key"}` | no | Label shown above player |
| `weight` | number | no | Flex-grow within parent Row/Column |

---

## Row

Horizontal layout container.

| Prop | Type | Required | Description |
|---|---|---|---|
| `id` | string | yes | |
| `component` | `"Row"` | yes | |
| `children` | list of IDs or template object | yes | Child node IDs, or `{"componentId": "tmpl", "path": "/list"}` |
| `justify` | `"start"` \| `"center"` \| `"end"` \| `"spaceBetween"` \| `"spaceAround"` \| `"spaceEvenly"` \| `"stretch"` | no | Main-axis alignment. Default: `"start"` |
| `align` | `"start"` \| `"center"` \| `"end"` \| `"stretch"` | no | Cross-axis alignment. Default: `"stretch"` |
| `weight` | number | no | Flex-grow within parent Row/Column |

---

## Column

Vertical layout container.

| Prop | Type | Required | Description |
|---|---|---|---|
| `id` | string | yes | |
| `component` | `"Column"` | yes | |
| `children` | list of IDs or template object | yes | Child node IDs, or `{"componentId": "tmpl", "path": "/list"}` |
| `justify` | `"start"` \| `"center"` \| `"end"` \| `"spaceBetween"` \| `"spaceAround"` \| `"spaceEvenly"` \| `"stretch"` | no | Default: `"start"` |
| `align` | `"start"` \| `"center"` \| `"end"` \| `"stretch"` | no | Default: `"stretch"` |
| `weight` | number | no | Flex-grow within parent Row/Column |

---

## List

Scrollable list. Supports static children or data-driven template expansion.

| Prop | Type | Required | Description |
|---|---|---|---|
| `id` | string | yes | |
| `component` | `"List"` | yes | |
| `children` | list of IDs or template object | yes | Static: `["id1","id2"]`. Template: `{"componentId": "tmpl-id", "path": "/dataKey"}` |
| `direction` | `"vertical"` \| `"horizontal"` | no | Default: `"vertical"` |
| `align` | `"start"` \| `"center"` \| `"end"` \| `"stretch"` | no | Cross-axis alignment. Default: `"stretch"` |

**Template children** — renders one instance of `componentId` per item in the data array at `path`.
Within the template component tree, use relative paths (no leading `/`): `{"path": "name"}` resolves to `items[i].name`.

```python
{"id": "list", "component": "List", "children": {"componentId": "row-tmpl", "path": "/docs"}},
{"id": "row-tmpl", "component": "Row", "children": ["r-title", "r-status"]},
{"id": "r-title",  "component": "Text", "text": {"path": "title"},  "variant": "body"},
{"id": "r-status", "component": "Text", "text": {"path": "status"}, "variant": "caption"},
# data_model: {"docs": [{"title": "...", "status": "..."}, ...]}
```

---

## Card

Container with card styling (border, shadow, background).

| Prop | Type | Required | Description |
|---|---|---|---|
| `id` | string | yes | |
| `component` | `"Card"` | yes | |
| `child` | string ID | yes | Single child ID (wrap multiple in a Column) |
| `weight` | number | no | Flex-grow within parent Row/Column |

---

## Tabs

Tabbed layout. One tab shown at a time.

| Prop | Type | Required | Description |
|---|---|---|---|
| `id` | string | yes | |
| `component` | `"Tabs"` | yes | |
| `tabs` | list of `{"title": string, "child": string}` | yes | Tab definitions. **`title`** (not `label`) is the tab button text; `child` is the panel node ID. |

Each `child` node must also exist in the component list.

```python
{"id": "tabs", "component": "Tabs", "tabs": [
    {"title": "Summary",  "child": "summary-col"},
    {"title": "Evidence", "child": "evidence-col"},
]}
```

---

## Modal

Overlay dialog opened by clicking a trigger component.

| Prop | Type | Required | Description |
|---|---|---|---|
| `id` | string | yes | |
| `component` | `"Modal"` | yes | |
| `trigger` | string ID | yes | ID of the component that opens the modal (e.g. a Button) |
| `content` | string ID | yes | ID of the component shown inside the modal |

Both `trigger` and `content` must exist as separate nodes in the component list.

```python
{"id": "modal",        "component": "Modal",  "trigger": "open-btn", "content": "modal-body"},
{"id": "open-btn",     "component": "Button", "child": "btn-lbl"},
{"id": "btn-lbl",      "component": "Text",   "text": "Show details", "variant": "body"},
{"id": "modal-body",   "component": "Column", "children": ["modal-title", "modal-text"]},
{"id": "modal-title",  "component": "Text",   "text": {"path": "/title"},   "variant": "h3"},
{"id": "modal-text",   "component": "Text",   "text": {"path": "/details"}, "variant": "body"},
```

---

## Divider

Horizontal or vertical rule. No children.

| Prop | Type | Required | Description |
|---|---|---|---|
| `id` | string | yes | |
| `component` | `"Divider"` | yes | |
| `axis` | `"horizontal"` \| `"vertical"` | no | Default: `"horizontal"` |

---

## Button

Clickable button. For display surfaces, omit `action` (button renders but clicks do nothing).

| Prop | Type | Required | Description |
|---|---|---|---|
| `id` | string | yes | |
| `component` | `"Button"` | yes | |
| `child` | string ID | yes | ID of a child component — use a `Text` for the label |
| `variant` | `"default"` \| `"primary"` \| `"borderless"` | no | Default: `"default"` |
| `action` | function call object | no | e.g. `{"call": "openUrl", "args": {"url": "https://..."}}` |

```python
{"id": "btn",     "component": "Button", "child": "btn-lbl", "variant": "primary"},
{"id": "btn-lbl", "component": "Text",   "text": "Open",     "variant": "body"},
```

---

## TextField

Text input field.

| Prop | Type | Required | Description |
|---|---|---|---|
| `id` | string | yes | |
| `component` | `"TextField"` | yes | |
| `label` | string or `{"path": "/key"}` | yes | Field label |
| `value` | string or `{"path": "/key"}` | no | Current value |
| `placeholder` | string or `{"path": "/key"}` | no | Placeholder text |
| `variant` | `"shortText"` \| `"longText"` \| `"number"` \| `"obscured"` | no | Default: `"shortText"` |

---

## CheckBox

Toggle checkbox. `value` (boolean) controls checked state.

| Prop | Type | Required | Description |
|---|---|---|---|
| `id` | string | yes | |
| `component` | `"CheckBox"` | yes | |
| `label` | string or `{"path": "/key"}` | yes | Label text |
| `value` | boolean or `{"path": "/key"}` | yes | `true` = checked, `false` = unchecked |

---

## ChoicePicker

Single or multi-select from a list of options.

| Prop | Type | Required | Description |
|---|---|---|---|
| `id` | string | yes | |
| `component` | `"ChoicePicker"` | yes | |
| `options` | list of `{"label": string, "value": string}` | yes | Available choices |
| `value` | list of strings or `{"path": "/key"}` | yes | Currently selected values (array). Single-select: one element. |
| `label` | string or `{"path": "/key"}` | no | Group label |
| `variant` | `"mutuallyExclusive"` \| `"multipleSelection"` | no | Default: `"mutuallyExclusive"` |
| `displayStyle` | `"checkbox"` \| `"chips"` | no | Default: `"checkbox"` |
| `filterable` | boolean | no | Show search filter. Default: `false` |

---

## Slider

Numeric range slider.

| Prop | Type | Required | Description |
|---|---|---|---|
| `id` | string | yes | |
| `component` | `"Slider"` | yes | |
| `value` | number or `{"path": "/key"}` | yes | Current value |
| `max` | number | yes | Maximum value |
| `label` | string or `{"path": "/key"}` | no | Slider label |
| `min` | number | no | Minimum value. Default: `0` |
| `steps` | integer | no | Number of discrete steps |

---

## DateTimeInput

Date and/or time picker.

| Prop | Type | Required | Description |
|---|---|---|---|
| `id` | string | yes | |
| `component` | `"DateTimeInput"` | yes | |
| `value` | string or `{"path": "/key"}` | yes | ISO 8601 value. Empty string `""` if unset. |
| `enableDate` | boolean | no | Show date picker. Default: `false` |
| `enableTime` | boolean | no | Show time picker. Default: `false` |
| `label` | string or `{"path": "/key"}` | no | Field label |
| `min` | string or `{"path": "/key"}` | no | Minimum allowed date/time (ISO 8601) |
| `max` | string or `{"path": "/key"}` | no | Maximum allowed date/time (ISO 8601) |
