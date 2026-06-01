# Phase 1: Skill File Content

All files live under `backend/app/agents/chat/skills/a2ui/`.

Delete old reference files:
- `references/wiki_card.md`
- `references/source_block.md`
- `references/doc_compare.md`
- `references/topic_map.md`
- `references/knowledge_panel.md`
- `references/doc_status_board.md`

Create new files below.

---

## `skills/a2ui/SKILL.md`

```markdown
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
```

---

## `skills/a2ui/references/protocol.md`

```markdown
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
`compare_arrows`, `library_books`, `search`, `close`, `done`

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
```

---

## `skills/a2ui/references/catalog_guide.md`

```markdown
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
`arrow_downward`, `document_scanner`, `schedule`, `person`

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
| `tabs` | list of `{label: string, child: string}` | yes | Tab definitions |

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
```

---

## `skills/a2ui/references/examples.md`

````markdown
# A2UI Chat-Wiki Examples

Complete working examples for common chat-wiki UI patterns.
Copy and adapt the closest example for your task.

---

## 1. Document Wiki Summary Card

Use when: showing a single document's wiki page content.

```python
render_ui(
    components=[
        {"id": "root",      "component": "Card",   "child": "col"},
        {"id": "col",       "component": "Column", "children": ["header-row", "divider", "body", "topics-row"]},
        # Header: title + date
        {"id": "header-row","component": "Row",    "children": ["icon", "title-col"], "align": "center"},
        {"id": "icon",      "component": "Icon",   "name": "description"},
        {"id": "title-col", "component": "Column", "children": ["title", "date"]},
        {"id": "title",     "component": "Text",   "text": {"path": "/title"},   "variant": "h3"},
        {"id": "date",      "component": "Text",   "text": {"path": "/date"},    "variant": "caption"},
        # Divider
        {"id": "divider",   "component": "Divider"},
        # Content body
        {"id": "body",      "component": "Text",   "text": {"path": "/content"}, "variant": "body"},
        # Topic chips row
        {"id": "topics-row","component": "Row",    "children": ["topics-label", "topic-list"]},
        {"id": "topics-label","component": "Text", "text": "topics",             "variant": "caption"},
        {"id": "topic-list","component": "List",   "children": ["t0", "t1", "t2"], "orientation": "horizontal"},
        {"id": "t0",        "component": "Text",   "text": {"path": "/topic0"},  "variant": "caption"},
        {"id": "t1",        "component": "Text",   "text": {"path": "/topic1"},  "variant": "caption"},
        {"id": "t2",        "component": "Text",   "text": {"path": "/topic2"},  "variant": "caption"},
    ],
    data_model={
        "title": "Attention Is All You Need",
        "date": "2017-06-12",
        "content": "This paper presents the Transformer, a novel architecture...",
        "topic0": "transformers",
        "topic1": "attention mechanism",
        "topic2": "sequence modeling",
    }
)
```

**Adapt for more/fewer topics:** Add or remove `tN` nodes from `topic-list.children`
and matching `tN` nodes + `data_model` keys.

---

## 2. Source Quote Block

Use when: surfacing an exact passage or evidence chunk from a document.

```python
render_ui(
    components=[
        {"id": "root",      "component": "Card",   "child": "col"},
        {"id": "col",       "component": "Column", "children": ["header-row", "divider", "quote", "meta-row"]},
        # Header
        {"id": "header-row","component": "Row",    "children": ["src-icon", "doc-title"], "align": "center"},
        {"id": "src-icon",  "component": "Icon",   "name": "format_quote"},
        {"id": "doc-title", "component": "Text",   "text": {"path": "/docTitle"}, "variant": "h4"},
        # Divider
        {"id": "divider",   "component": "Divider"},
        # Quote text
        {"id": "quote",     "component": "Text",   "text": {"path": "/excerpt"},  "variant": "body"},
        # Metadata: page ref + relevance
        {"id": "meta-row",  "component": "Row",    "children": ["page-ref", "score"], "justify": "spaceBetween"},
        {"id": "page-ref",  "component": "Text",   "text": {"path": "/pageRef"},  "variant": "caption"},
        {"id": "score",     "component": "Text",   "text": {"path": "/score"},    "variant": "caption"},
    ],
    data_model={
        "docTitle": "Attention Is All You Need",
        "excerpt": "The Transformer follows an encoder-decoder structure using stacked "
                   "self-attention and point-wise, fully connected layers...",
        "pageRef": "p. 2",
        "score": "relevance: 94%",
    }
)
```

---

## 3. Document Comparison

Use when: comparing two documents on the same topic side-by-side.

```python
render_ui(
    components=[
        {"id": "root",       "component": "Card",   "child": "col"},
        {"id": "col",        "component": "Column", "children": ["topic-row", "divider", "compare-row"]},
        # Topic header
        {"id": "topic-row",  "component": "Row",    "children": ["cmp-icon", "topic"], "align": "center"},
        {"id": "cmp-icon",   "component": "Icon",   "name": "compare_arrows"},
        {"id": "topic",      "component": "Text",   "text": {"path": "/topic"}, "variant": "h3"},
        # Divider
        {"id": "divider",    "component": "Divider"},
        # Two-column comparison
        {"id": "compare-row","component": "Row",    "children": ["left-col", "right-col"], "justify": "spaceBetween"},
        # Left document
        {"id": "left-col",   "component": "Column", "children": ["left-title", "left-role", "left-excerpt"]},
        {"id": "left-title", "component": "Text",   "text": {"path": "/doc1Title"},   "variant": "h4"},
        {"id": "left-role",  "component": "Text",   "text": {"path": "/doc1Role"},    "variant": "caption"},
        {"id": "left-excerpt","component": "Text",  "text": {"path": "/doc1Excerpt"}, "variant": "body"},
        # Right document
        {"id": "right-col",  "component": "Column", "children": ["right-title", "right-role", "right-excerpt"]},
        {"id": "right-title","component": "Text",   "text": {"path": "/doc2Title"},   "variant": "h4"},
        {"id": "right-role", "component": "Text",   "text": {"path": "/doc2Role"},    "variant": "caption"},
        {"id": "right-excerpt","component": "Text", "text": {"path": "/doc2Excerpt"}, "variant": "body"},
    ],
    data_model={
        "topic": "Transformer vs RNN for sequence modeling",
        "doc1Title": "Attention Is All You Need",
        "doc1Role": "current",
        "doc1Excerpt": "Uses self-attention exclusively — no recurrence. O(1) sequential ops.",
        "doc2Title": "Sequence to Sequence Learning",
        "doc2Role": "comparison",
        "doc2Excerpt": "LSTM encoder-decoder with attention. Sequential O(n) dependency.",
    }
)
```

For 3+ documents: add more column nodes and extend `compare-row.children`.

---

## 4. Topic Map / Cluster Overview

Use when: showing topic clusters across the library, or what subjects exist.

```python
render_ui(
    components=[
        {"id": "root",       "component": "Card",   "child": "col"},
        {"id": "col",        "component": "Column", "children": ["header-row", "divider", "topic-list"]},
        # Header
        {"id": "header-row", "component": "Row",    "children": ["map-icon", "heading"], "align": "center"},
        {"id": "map-icon",   "component": "Icon",   "name": "topic"},
        {"id": "heading",    "component": "Text",   "text": "Library Topics", "variant": "h3"},
        # Divider
        {"id": "divider",    "component": "Divider"},
        # Topic chips (horizontal wrapping list)
        {"id": "topic-list", "component": "List",   "children": ["t0", "t1", "t2", "t3", "t4"], "orientation": "horizontal"},
        {"id": "t0",         "component": "Row",    "children": ["t0-lbl", "t0-cnt"], "align": "center"},
        {"id": "t0-lbl",     "component": "Text",   "text": {"path": "/t0label"},   "variant": "body"},
        {"id": "t0-cnt",     "component": "Text",   "text": {"path": "/t0count"},   "variant": "caption"},
        {"id": "t1",         "component": "Row",    "children": ["t1-lbl", "t1-cnt"], "align": "center"},
        {"id": "t1-lbl",     "component": "Text",   "text": {"path": "/t1label"},   "variant": "body"},
        {"id": "t1-cnt",     "component": "Text",   "text": {"path": "/t1count"},   "variant": "caption"},
        {"id": "t2",         "component": "Row",    "children": ["t2-lbl", "t2-cnt"], "align": "center"},
        {"id": "t2-lbl",     "component": "Text",   "text": {"path": "/t2label"},   "variant": "body"},
        {"id": "t2-cnt",     "component": "Text",   "text": {"path": "/t2count"},   "variant": "caption"},
        {"id": "t3",         "component": "Row",    "children": ["t3-lbl", "t3-cnt"], "align": "center"},
        {"id": "t3-lbl",     "component": "Text",   "text": {"path": "/t3label"},   "variant": "body"},
        {"id": "t3-cnt",     "component": "Text",   "text": {"path": "/t3count"},   "variant": "caption"},
        {"id": "t4",         "component": "Row",    "children": ["t4-lbl", "t4-cnt"], "align": "center"},
        {"id": "t4-lbl",     "component": "Text",   "text": {"path": "/t4label"},   "variant": "body"},
        {"id": "t4-cnt",     "component": "Text",   "text": {"path": "/t4count"},   "variant": "caption"},
    ],
    data_model={
        "t0label": "machine learning",  "t0count": "4 docs",
        "t1label": "transformers",      "t1count": "3 docs",
        "t2label": "NLP",               "t2count": "5 docs",
        "t3label": "computer vision",   "t3count": "2 docs",
        "t4label": "reinforcement learning", "t4count": "1 doc",
    }
)
```

---

## 5. Knowledge Panel — Multi-Source Answer

Use when: presenting a synthesized answer with visible source citations.

```python
render_ui(
    components=[
        {"id": "root",        "component": "Card",   "child": "col"},
        {"id": "col",         "component": "Column", "children": ["q-row", "divider", "answer", "src-label", "src-list"]},
        # Query header
        {"id": "q-row",       "component": "Row",    "children": ["q-icon", "query"], "align": "center"},
        {"id": "q-icon",      "component": "Icon",   "name": "search"},
        {"id": "query",       "component": "Text",   "text": {"path": "/query"},  "variant": "h4"},
        # Divider
        {"id": "divider",     "component": "Divider"},
        # Synthesized answer (markdown)
        {"id": "answer",      "component": "Text",   "text": {"path": "/answer"}, "variant": "body"},
        # Sources section
        {"id": "src-label",   "component": "Text",   "text": "sources",           "variant": "caption"},
        {"id": "src-list",    "component": "List",   "children": ["s0", "s1", "s2"]},
        # Source items
        {"id": "s0",          "component": "Row",    "children": ["s0-icon", "s0-col"], "align": "center"},
        {"id": "s0-icon",     "component": "Icon",   "name": "library_books"},
        {"id": "s0-col",      "component": "Column", "children": ["s0-title", "s0-snip"]},
        {"id": "s0-title",    "component": "Text",   "text": {"path": "/s0title"},  "variant": "h5"},
        {"id": "s0-snip",     "component": "Text",   "text": {"path": "/s0snip"},   "variant": "caption"},
        {"id": "s1",          "component": "Row",    "children": ["s1-icon", "s1-col"], "align": "center"},
        {"id": "s1-icon",     "component": "Icon",   "name": "library_books"},
        {"id": "s1-col",      "component": "Column", "children": ["s1-title", "s1-snip"]},
        {"id": "s1-title",    "component": "Text",   "text": {"path": "/s1title"},  "variant": "h5"},
        {"id": "s1-snip",     "component": "Text",   "text": {"path": "/s1snip"},   "variant": "caption"},
        {"id": "s2",          "component": "Row",    "children": ["s2-icon", "s2-col"], "align": "center"},
        {"id": "s2-icon",     "component": "Icon",   "name": "library_books"},
        {"id": "s2-col",      "component": "Column", "children": ["s2-title", "s2-snip"]},
        {"id": "s2-title",    "component": "Text",   "text": {"path": "/s2title"},  "variant": "h5"},
        {"id": "s2-snip",     "component": "Text",   "text": {"path": "/s2snip"},   "variant": "caption"},
    ],
    data_model={
        "query": "How does the Transformer handle long-range dependencies?",
        "answer": "The Transformer uses **self-attention** to directly relate "
                  "any two positions in a sequence in O(1) operations, "
                  "unlike RNNs which require O(n) sequential steps.\n\n"
                  "This is formalised as: $\\text{Attention}(Q,K,V) = "
                  "\\text{softmax}(QK^T/\\sqrt{d_k})V$",
        "s0title": "Attention Is All You Need",
        "s0snip": "Self-attention allows each position to attend to all positions...",
        "s1title": "BERT: Pre-training of Deep Bidirectional Transformers",
        "s1snip": "Bidirectional self-attention across the full sequence...",
        "s2title": "An Image is Worth 16x16 Words",
        "s2snip": "Vision Transformer applies self-attention to image patches...",
    }
)
```

---

## 6. Document Library Status Board

Use when: user asks what documents they have or what the ingestion status is.

```python
render_ui(
    components=[
        {"id": "root",    "component": "Card",   "child": "col"},
        {"id": "col",     "component": "Column", "children": ["header-row", "divider", "doc-list"]},
        # Header
        {"id": "header-row","component": "Row",  "children": ["lib-icon", "heading"], "align": "center"},
        {"id": "lib-icon","component": "Icon",   "name": "library_books"},
        {"id": "heading", "component": "Text",   "text": "Library Status", "variant": "h3"},
        # Divider
        {"id": "divider", "component": "Divider"},
        # Document rows
        {"id": "doc-list","component": "List",   "children": ["d0", "d1", "d2"]},
        # Doc 0
        {"id": "d0",      "component": "Row",    "children": ["d0-icon", "d0-title", "d0-type", "d0-status"], "justify": "spaceBetween", "align": "center"},
        {"id": "d0-icon", "component": "Icon",   "name": {"path": "/d0icon"}},
        {"id": "d0-title","component": "Text",   "text": {"path": "/d0title"},  "variant": "body"},
        {"id": "d0-type", "component": "Text",   "text": {"path": "/d0type"},   "variant": "caption"},
        {"id": "d0-status","component": "Text",  "text": {"path": "/d0status"}, "variant": "caption"},
        # Doc 1
        {"id": "d1",      "component": "Row",    "children": ["d1-icon", "d1-title", "d1-type", "d1-status"], "justify": "spaceBetween", "align": "center"},
        {"id": "d1-icon", "component": "Icon",   "name": {"path": "/d1icon"}},
        {"id": "d1-title","component": "Text",   "text": {"path": "/d1title"},  "variant": "body"},
        {"id": "d1-type", "component": "Text",   "text": {"path": "/d1type"},   "variant": "caption"},
        {"id": "d1-status","component": "Text",  "text": {"path": "/d1status"}, "variant": "caption"},
        # Doc 2
        {"id": "d2",      "component": "Row",    "children": ["d2-icon", "d2-title", "d2-type", "d2-status"], "justify": "spaceBetween", "align": "center"},
        {"id": "d2-icon", "component": "Icon",   "name": {"path": "/d2icon"}},
        {"id": "d2-title","component": "Text",   "text": {"path": "/d2title"},  "variant": "body"},
        {"id": "d2-type", "component": "Text",   "text": {"path": "/d2type"},   "variant": "caption"},
        {"id": "d2-status","component": "Text",  "text": {"path": "/d2status"}, "variant": "caption"},
    ],
    data_model={
        "d0title": "Attention Is All You Need", "d0type": "pdf", "d0status": "ready",    "d0icon": "check_circle",
        "d1title": "BERT Paper",                "d1type": "pdf", "d1status": "indexing", "d1icon": "schedule",
        "d2title": "ViT Paper",                 "d2type": "pdf", "d2status": "ready",    "d2icon": "check_circle",
    }
)
```

**For more/fewer docs:** add/remove `dN` row nodes and extend `doc-list.children`.
````
