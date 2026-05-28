# Generative UI Enhancement Plan

Goal: make chat responses feel adaptive, impressive, and domain-native — regardless of material type.
Two phases. A ships via prompt engineering only. B adds custom components + CLI regeneration.

---

## Phase A — Visualization Decision Tree (AGENTS.md rewrite)

No new code. Rewrites `backend/app/agents/chat/AGENTS.md` output format section.

### Principle

Agent detects **query intent first**, then **content structure**. Intent overrides structure.

### Intent → Component Mapping

| Query intent (keywords/pattern) | Primary component | Secondary |
|---|---|---|
| "compare", "vs", "difference between" | `Tabs` (one tab per doc) | `Table` for attribute comparison |
| "summarize", "overview", "what is" | `SectionBlock` (foldable sections) | `CardHeader` + `TextContent` |
| "trend", "over time", "growth", "history" | `LineChart` / `AreaChart` | `Table` fallback |
| "breakdown", "distribution", "how much" | `BarChart` / `PieChart` | `Table` |
| "steps", "how to", "process", "workflow" | `Steps` | `ListBlock` |
| "list", "what are", "show all" | `ListBlock` (clickable items) | `Table` |
| "show documents", "what do I have" | `Table` (title, status, topics) | `ListBlock` |
| "highlight", "key points", "takeaways" | `SectionBlock` with `Callout`s | `MarkDownRenderer` |
| general Q&A (no strong intent signal) | `SectionBlock` | `TextContent` |

### Content Structure → Component Mapping (secondary signal)

| Retrieved content looks like | Use |
|---|---|
| Numerical data / metrics | Chart (pick type by shape: compare → Bar, trend → Line, proportion → Pie) |
| Tabular / columnar data | `Table` |
| Ordered steps / instructions | `Steps` |
| Multiple docs on same topic | `Tabs` (one per doc) |
| Long prose report | `SectionBlock` (isFoldable=true) |
| Short factual answer | `TextContent` + `FollowUpBlock` |
| Multiple media types | `Carousel` |

### Visualization Rules (add to AGENTS.md)

```
## Visualization Rules

ALWAYS pick a visualization component — never default to plain TextContent for multi-paragraph responses.

Decision order:
1. Read user query intent (keywords: compare/trend/list/summarize/steps/breakdown)
2. Read retrieved content structure (tabular/numerical/prose/multi-doc/sequential)
3. Intent overrides structure if they conflict

Component selection:
- 2+ docs, any query → Tabs (one tab per doc) or Table for comparison
- Numerical/metric data → Chart (Bar for comparison, Line for trend, Pie for proportion/distribution)
- Sequential process → Steps
- Long structured report → SectionBlock (isFoldable=true), one section per major topic
- Clickable options/docs → ListBlock with ListItem
- Short fact → TextContent, then FollowUpBlock with 3 suggestions
- Charts and Tables ALWAYS end with FollowUpBlock

ALWAYS end every response with FollowUpBlock (2-3 items, max 6 words each, specific to content shown).
ALWAYS use Callout(variant="info") for important caveats from the library.
ALWAYS use Callout(variant="warning") for conflict warnings.
ALWAYS use CodeBlock for any code, config, or structured text from source docs.
```

### Content-type Specific Rules

```
## Content-Type Heuristics

Financial / numerical docs:
  → Lead with key metrics in BarChart or Table
  → SectionBlock for analysis sections
  → FollowUpBlock: "Show trend", "Compare periods", "Break down by category"

Research / academic:
  → CardHeader (paper title, authors)
  → SectionBlock: Abstract, Methodology, Findings, Conclusions
  → Table for experimental results
  → FollowUpBlock: "Show methodology", "Compare findings", "List references"

Technical docs / code:
  → Steps for setup/install flows
  → CodeBlock for all code samples
  → Table for API parameters/options
  → FollowUpBlock: "Show example", "Explain parameter", "Show alternatives"

Legal / compliance:
  → SectionBlock (isFoldable=true) for clauses
  → Callout(variant="warning") for obligations/deadlines
  → Table for requirement comparisons
  → FollowUpBlock: "Show obligations", "Compare versions", "List deadlines"

General notes / mixed:
  → SectionBlock grouped by topic
  → ListBlock for action items
  → FollowUpBlock: topic-specific next steps
```

---

## Phase B — Custom Components

Adds 8 domain-specific components via `defineComponent`. After each batch, regenerate system prompt:

```bash
npx @openuidev/cli generate-prompt --library frontend/lib/openui-library.tsx > backend/app/agents/chat/openui_system_prompt.md
```

### Priority order

1. DocumentCard
2. WikiSummaryCard
3. CitationCard
4. KnowledgeGapCard
5. ConflictBanner
6. TopicCluster
7. ComparisonView
8. ChunkEvidence

---

### 1. DocumentCard

**When agent uses:** after `list_docs` or `search_documents`. Replace plain text doc listings.

**Props:**
| Prop | Type | Description |
|---|---|---|
| title | string | Document filename/title |
| status | "processing" \| "ready" \| "conflict" | Ingestion status |
| summary | string | Short summary (1-2 sentences) |
| topics | string[] | Topic tags |
| docId | string | UUID — used for open action |

**Renders:** Card with title, colored status badge, summary text, topic tags, "Open" button that sends `__cite__:<docId>`.

**defineComponent location:** `frontend/lib/openui-library.tsx`

```tsx
defineComponent({
  name: 'DocumentCard',
  description: 'Shows a document with status, summary, topics, and open action',
  schema: z.object({
    title: z.string(),
    status: z.enum(['processing', 'ready', 'conflict']),
    summary: z.string(),
    topics: z.array(z.string()),
    docId: z.string(),
  }),
  component: ({ props }) => (
    <div className="doc-card">
      <div className="doc-card-header">
        <span className="doc-title">{props.title}</span>
        <StatusBadge status={props.status} />
      </div>
      <p className="doc-summary">{props.summary}</p>
      <TagBlock tags={props.topics} />
      <Button onClick={() => sendAction(`__cite__:${props.docId}`)}>Open</Button>
    </div>
  ),
})
```

**OpenUI Lang usage:**
```
root = Card([header, docs, followups])
docs = ListBlock([d1, d2, d3])
d1 = DocumentCard("Report Q1.pdf", "ready", "Q1 financial summary...", ["finance", "2024"], "uuid-abc")
```

---

### 2. WikiSummaryCard

**When agent uses:** after `get_wiki_page`. Replaces raw wiki text dump.

**Props:**
| Prop | Type | Description |
|---|---|---|
| title | string | Document title |
| summary | string | Wiki synthesized summary (supports markdown) |
| topics | string[] | Covered topics |
| docId | string | UUID for citation/open |
| hasConflict | boolean | Shows conflict warning if true |

**Renders:** Card with title, conflict callout (if `hasConflict`), summary in MarkDownRenderer, topic tags, citation button.

---

### 3. CitationCard

**When agent uses:** inline after any retrieved passage, replaces bare ① buttons.

**Props:**
| Prop | Type | Description |
|---|---|---|
| index | number | Citation number (1, 2, 3...) |
| docTitle | string | Source document name |
| excerpt | string | Relevant chunk text (truncated to ~200 chars) |
| docId | string | UUID |

**Renders:** Compact collapsible card — shows circled number + doc name. Expand to see excerpt. Click to open doc in left panel.

**Why better than bare Button:** user sees what they're citing before clicking. Builds trust.

---

### 4. KnowledgeGapCard

**When agent uses:** when query topic not found in library (no results from `search_documents`).

**Props:**
| Prop | Type | Description |
|---|---|---|
| query | string | What user asked |
| suggestion | string | What to upload to fill the gap |
| relatedTopics | string[] | Topics that ARE in the library |

**Renders:** Callout(variant="warning") + suggestion text + related topic tags as clickable FollowUpItems.

**Critical for general wiki:** prevents silent "I don't know" or hallucinated answers.

---

### 5. ConflictBanner

**When agent uses:** when `has_conflict: true` found during retrieval, before calling `resolve_conflict`.

**Props:**
| Prop | Type | Description |
|---|---|---|
| doc1Title | string | First conflicting doc |
| doc2Title | string | Second conflicting doc |
| conflictSummary | string | What contradicts what |
| recommendation | string | Agent's suggested resolution |

**Renders:** Callout(variant="error") with two-column doc names, conflict description, recommendation text, and "Resolve" button.

---

### 6. TopicCluster

**When agent uses:** "what topics do my docs cover?", "show knowledge map" queries.

**Props:**
| Prop | Type | Description |
|---|---|---|
| clusters | {topic: string, count: number, docs: string[]}[] | Topic groups |

**Renders:** TagBlock grouped by frequency, or RadarChart if >5 topics. Clicking a tag sends it as a follow-up query.

---

### 7. ComparisonView

**When agent uses:** "compare X vs Y" queries across two docs.

**Props:**
| Prop | Type | Description |
|---|---|---|
| doc1 | {title: string, points: string[]} | First doc key points |
| doc2 | {title: string, points: string[]} | Second doc key points |
| verdict | string | Agent synthesis/recommendation |

**Renders:** Two-column Tabs or Table with key points side-by-side. Verdict as Callout(variant="info") below.

---

### 8. ChunkEvidence

**When agent uses:** "show me the exact quote", "what's the source" queries — after `search_chunks`.

**Props:**
| Prop | Type | Description |
|---|---|---|
| text | string | Raw chunk text |
| docTitle | string | Source doc |
| section | string | Section/page hint (if available) |
| relevanceScore | number | Similarity score 0-1 |

**Renders:** CodeBlock-style quoted text + doc name + relevance bar. Compact, scannable.

---

## Implementation Checklist

### Phase A (prompt only, ~20 min)
- [ ] Rewrite output format section of `backend/app/agents/chat/AGENTS.md` with visualization decision tree
- [ ] Add content-type heuristics section
- [ ] Test with financial doc query → expect Chart
- [ ] Test with "compare two docs" → expect Tabs
- [ ] Test with "how to" query → expect Steps
- [ ] Test with unknown topic → expect KnowledgeGap callout (text for now)

### Phase B (custom components, ~2-3 hrs)
- [ ] Install/verify `@openuidev/react-lang` `defineComponent` API available
- [ ] Implement DocumentCard in `frontend/lib/openui-library.tsx`
- [ ] Implement WikiSummaryCard
- [ ] Implement CitationCard
- [ ] Implement KnowledgeGapCard
- [ ] Implement ConflictBanner
- [ ] Implement TopicCluster
- [ ] Implement ComparisonView
- [ ] Implement ChunkEvidence
- [ ] Regenerate `openui_system_prompt.md` via CLI after each component batch
- [ ] Update `AGENTS.md` with new component signatures + usage rules
- [ ] End-to-end test: each component renders correctly during streaming

---

## Key Constraints

- `openui_system_prompt.md` is auto-generated — never edit manually
- After adding any `defineComponent`, run CLI regeneration before updating `AGENTS.md`
- All components must work during streaming (forward references + hoisting)
- `DocumentCard.docId` and `CitationCard.docId` must use exact UUIDs from tool results — agent must never guess
- `KnowledgeGapCard` must fire before any general-knowledge fallback answer
