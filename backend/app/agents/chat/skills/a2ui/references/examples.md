# A2UI Chat-Wiki Examples

Complete working examples for common chat-wiki UI patterns.
Copy and adapt the closest example for your task.

---

## 1. Document Wiki Summary Card

Use when: showing a single document's wiki page content.

```python
render_ui(
    components=[
        {"id": "root",        "component": "Card",   "child": "col"},
        {"id": "col",         "component": "Column", "children": ["header-row", "divider", "body", "topics-row"]},
        # Header: icon + title + date
        {"id": "header-row",  "component": "Row",    "children": ["icon", "title-col"], "align": "center"},
        {"id": "icon",        "component": "Icon",   "name": "description"},
        {"id": "title-col",   "component": "Column", "children": ["title", "date"]},
        {"id": "title",       "component": "Text",   "text": {"path": "/title"},   "variant": "h3"},
        {"id": "date",        "component": "Text",   "text": {"path": "/date"},    "variant": "caption"},
        # Divider
        {"id": "divider",     "component": "Divider"},
        # Content body
        {"id": "body",        "component": "Text",   "text": {"path": "/content"}, "variant": "body"},
        # Topic chips
        {"id": "topics-row",  "component": "Row",    "children": ["topics-label", "topic-list"]},
        {"id": "topics-label","component": "Text",   "text": "topics",             "variant": "caption"},
        {"id": "topic-list",  "component": "List",   "children": ["t0", "t1", "t2"], "orientation": "horizontal"},
        {"id": "t0",          "component": "Text",   "text": {"path": "/topic0"},  "variant": "caption"},
        {"id": "t1",          "component": "Text",   "text": {"path": "/topic1"},  "variant": "caption"},
        {"id": "t2",          "component": "Text",   "text": {"path": "/topic2"},  "variant": "caption"},
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
        {"id": "root",        "component": "Card",   "child": "col"},
        {"id": "col",         "component": "Column", "children": ["topic-row", "divider", "compare-row"]},
        # Topic header
        {"id": "topic-row",   "component": "Row",    "children": ["cmp-icon", "topic"], "align": "center"},
        {"id": "cmp-icon",    "component": "Icon",   "name": "compare_arrows"},
        {"id": "topic",       "component": "Text",   "text": {"path": "/topic"}, "variant": "h3"},
        # Divider
        {"id": "divider",     "component": "Divider"},
        # Two-column comparison
        {"id": "compare-row", "component": "Row",    "children": ["left-col", "right-col"], "justify": "spaceBetween"},
        # Left document
        {"id": "left-col",    "component": "Column", "children": ["left-title", "left-role", "left-excerpt"]},
        {"id": "left-title",  "component": "Text",   "text": {"path": "/doc1Title"},   "variant": "h4"},
        {"id": "left-role",   "component": "Text",   "text": {"path": "/doc1Role"},    "variant": "caption"},
        {"id": "left-excerpt","component": "Text",   "text": {"path": "/doc1Excerpt"}, "variant": "body"},
        # Right document
        {"id": "right-col",    "component": "Column", "children": ["right-title", "right-role", "right-excerpt"]},
        {"id": "right-title",  "component": "Text",   "text": {"path": "/doc2Title"},   "variant": "h4"},
        {"id": "right-role",   "component": "Text",   "text": {"path": "/doc2Role"},    "variant": "caption"},
        {"id": "right-excerpt","component": "Text",   "text": {"path": "/doc2Excerpt"}, "variant": "body"},
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
        # Topic chips (horizontal list)
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
        "t0label": "machine learning",       "t0count": "4 docs",
        "t1label": "transformers",           "t1count": "3 docs",
        "t2label": "NLP",                    "t2count": "5 docs",
        "t3label": "computer vision",        "t3count": "2 docs",
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
        {"id": "root",       "component": "Card",   "child": "col"},
        {"id": "col",        "component": "Column", "children": ["q-row", "divider", "answer", "src-label", "src-list"]},
        # Query header
        {"id": "q-row",      "component": "Row",    "children": ["q-icon", "query"], "align": "center"},
        {"id": "q-icon",     "component": "Icon",   "name": "search"},
        {"id": "query",      "component": "Text",   "text": {"path": "/query"},  "variant": "h4"},
        # Divider
        {"id": "divider",    "component": "Divider"},
        # Synthesized answer (markdown)
        {"id": "answer",     "component": "Text",   "text": {"path": "/answer"}, "variant": "body"},
        # Sources section
        {"id": "src-label",  "component": "Text",   "text": "sources",           "variant": "caption"},
        {"id": "src-list",   "component": "List",   "children": ["s0", "s1", "s2"]},
        # Source items
        {"id": "s0",         "component": "Row",    "children": ["s0-icon", "s0-col"], "align": "center"},
        {"id": "s0-icon",    "component": "Icon",   "name": "library_books"},
        {"id": "s0-col",     "component": "Column", "children": ["s0-title", "s0-snip"]},
        {"id": "s0-title",   "component": "Text",   "text": {"path": "/s0title"},  "variant": "h5"},
        {"id": "s0-snip",    "component": "Text",   "text": {"path": "/s0snip"},   "variant": "caption"},
        {"id": "s1",         "component": "Row",    "children": ["s1-icon", "s1-col"], "align": "center"},
        {"id": "s1-icon",    "component": "Icon",   "name": "library_books"},
        {"id": "s1-col",     "component": "Column", "children": ["s1-title", "s1-snip"]},
        {"id": "s1-title",   "component": "Text",   "text": {"path": "/s1title"},  "variant": "h5"},
        {"id": "s1-snip",    "component": "Text",   "text": {"path": "/s1snip"},   "variant": "caption"},
        {"id": "s2",         "component": "Row",    "children": ["s2-icon", "s2-col"], "align": "center"},
        {"id": "s2-icon",    "component": "Icon",   "name": "library_books"},
        {"id": "s2-col",     "component": "Column", "children": ["s2-title", "s2-snip"]},
        {"id": "s2-title",   "component": "Text",   "text": {"path": "/s2title"},  "variant": "h5"},
        {"id": "s2-snip",    "component": "Text",   "text": {"path": "/s2snip"},   "variant": "caption"},
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
        {"id": "root",      "component": "Card",   "child": "col"},
        {"id": "col",       "component": "Column", "children": ["header-row", "divider", "doc-list"]},
        # Header
        {"id": "header-row","component": "Row",    "children": ["lib-icon", "heading"], "align": "center"},
        {"id": "lib-icon",  "component": "Icon",   "name": "library_books"},
        {"id": "heading",   "component": "Text",   "text": "Library Status", "variant": "h3"},
        # Divider
        {"id": "divider",   "component": "Divider"},
        # Document rows
        {"id": "doc-list",  "component": "List",   "children": ["d0", "d1", "d2"]},
        # Doc 0
        {"id": "d0",        "component": "Row",    "children": ["d0-icon", "d0-title", "d0-type", "d0-status"], "justify": "spaceBetween", "align": "center"},
        {"id": "d0-icon",   "component": "Icon",   "name": {"path": "/d0icon"}},
        {"id": "d0-title",  "component": "Text",   "text": {"path": "/d0title"},  "variant": "body"},
        {"id": "d0-type",   "component": "Text",   "text": {"path": "/d0type"},   "variant": "caption"},
        {"id": "d0-status", "component": "Text",   "text": {"path": "/d0status"}, "variant": "caption"},
        # Doc 1
        {"id": "d1",        "component": "Row",    "children": ["d1-icon", "d1-title", "d1-type", "d1-status"], "justify": "spaceBetween", "align": "center"},
        {"id": "d1-icon",   "component": "Icon",   "name": {"path": "/d1icon"}},
        {"id": "d1-title",  "component": "Text",   "text": {"path": "/d1title"},  "variant": "body"},
        {"id": "d1-type",   "component": "Text",   "text": {"path": "/d1type"},   "variant": "caption"},
        {"id": "d1-status", "component": "Text",   "text": {"path": "/d1status"}, "variant": "caption"},
        # Doc 2
        {"id": "d2",        "component": "Row",    "children": ["d2-icon", "d2-title", "d2-type", "d2-status"], "justify": "spaceBetween", "align": "center"},
        {"id": "d2-icon",   "component": "Icon",   "name": {"path": "/d2icon"}},
        {"id": "d2-title",  "component": "Text",   "text": {"path": "/d2title"},  "variant": "body"},
        {"id": "d2-type",   "component": "Text",   "text": {"path": "/d2type"},   "variant": "caption"},
        {"id": "d2-status", "component": "Text",   "text": {"path": "/d2status"}, "variant": "caption"},
    ],
    data_model={
        "d0title": "Attention Is All You Need", "d0type": "pdf", "d0status": "ready",    "d0icon": "check_circle",
        "d1title": "BERT Paper",                "d1type": "pdf", "d1status": "indexing", "d1icon": "schedule",
        "d2title": "ViT Paper",                 "d2type": "pdf", "d2status": "ready",    "d2icon": "check_circle",
    }
)
```

**For more/fewer docs:** add/remove `dN` row nodes and extend `doc-list.children`.
