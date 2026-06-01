# Phase 6 — Frontend: A2UI Catalog + Renderer Setup

## Files to create

- `frontend/lib/a2ui/catalog.tsx` — component definitions + renderers
- `frontend/lib/a2ui/processor.ts` — MessageProcessor singleton + feed function
- `frontend/components/A2uiSurfaceRenderer.tsx` — renders surfaces inline in chat

---

## Install

```bash
pnpm add @a2ui/react @a2ui/web_core
```

---

## Component catalog: `frontend/lib/a2ui/catalog.tsx`

### WikiCard

```tsx
import { z } from 'zod'
import ReactMarkdown from 'react-markdown'

export const WikiCardDef = {
  name: 'WikiCard',
  schema: z.object({
    title: z.string(),
    content: z.string(),          // markdown
    topics: z.array(z.string()),
    doc_id: z.string(),
    created_at: z.string(),
  }),
}

export const WikiCardRenderer = createComponentImplementation(WikiCardDef, ({ props }) => (
  <div className="a2ui-wiki-card">
    <div className="wiki-card-header">
      <h3>{props.title}</h3>
      <span className="wiki-card-date">{props.created_at}</span>
    </div>
    <div className="wiki-card-topics">
      {props.topics.map(t => <span key={t} className="topic-chip">{t}</span>)}
    </div>
    <div className="wiki-card-content">
      <ReactMarkdown>{props.content}</ReactMarkdown>
    </div>
  </div>
))
```

### SourceBlock

```tsx
export const SourceBlockDef = {
  name: 'SourceBlock',
  schema: z.object({
    doc_title: z.string(),
    page_ref: z.string().optional(),
    excerpt: z.string(),
    doc_id: z.string(),
    relevance_score: z.number().optional(),
  }),
}
// Renderer: source citation block with excerpt + doc attribution
```

### DocCompare

```tsx
export const DocCompareDef = {
  name: 'DocCompare',
  schema: z.object({
    topic: z.string(),
    entries: z.array(z.object({
      doc_id: z.string(),
      title: z.string(),
      excerpt: z.string(),
      role: z.enum(['outdated', 'current', 'conflicting']),
    })),
  }),
}
// Renderer: horizontal scrollable cards, role badge per doc
```

### TopicMap

```tsx
export const TopicMapDef = {
  name: 'TopicMap',
  schema: z.object({
    topics: z.array(z.object({
      label: z.string(),
      doc_count: z.number(),
      docs: z.array(z.string()),
    })),
    highlighted_topic: z.string().optional(),
  }),
}
// Renderer: tag cloud or grid — topics sized by doc_count
```

### KnowledgePanel

```tsx
export const KnowledgePanelDef = {
  name: 'KnowledgePanel',
  schema: z.object({
    query: z.string(),
    answer_md: z.string(),
    sources: z.array(z.object({
      title: z.string(),
      snippet: z.string(),
      doc_id: z.string(),
    })),
  }),
}
// Renderer: answer block + collapsible source list
```

### DocStatusBoard

```tsx
export const DocStatusBoardDef = {
  name: 'DocStatusBoard',
  schema: z.object({
    docs: z.array(z.object({
      title: z.string(),
      status: z.string(),
      file_type: z.string(),
      topics: z.array(z.string()),
    })),
  }),
}
// Renderer: table or card grid of docs with status badges
```

### Catalog assembly

```typescript
import { Catalog } from '@a2ui/web_core/v0_9'

export const chatWikiCatalog = new Catalog(
  'chat-wiki-catalog',       // must match catalogId in SKILL.md
  [
    WikiCardRenderer,
    SourceBlockRenderer,
    DocCompareRenderer,
    TopicMapRenderer,
    KnowledgePanelRenderer,
    DocStatusBoardRenderer,
  ],
)
```

---

## MessageProcessor: `frontend/lib/a2ui/processor.ts`

```typescript
import { MessageProcessor } from '@a2ui/web_core/v0_9'
import { chatWikiCatalog } from './catalog'

// One processor per chat session — reset on New Chat
let _processor: MessageProcessor | null = null

export function getProcessor(): MessageProcessor {
  if (!_processor) {
    _processor = new MessageProcessor([chatWikiCatalog])
  }
  return _processor
}

export function resetProcessor() {
  _processor = new MessageProcessor([chatWikiCatalog])
}

export function feedA2uiMessage(json: object) {
  getProcessor().processMessages([json])
}
```

---

## Surface renderer: `frontend/components/A2uiSurfaceRenderer.tsx`

```tsx
'use client'
import { useEffect, useState } from 'react'
import { A2uiSurface } from '@a2ui/react/v0_9'
import { getProcessor } from '@/lib/a2ui/processor'

export default function A2uiSurfaceRenderer({ surfaceId }: { surfaceId: string }) {
  const processor = getProcessor()
  const [surface, setSurface] = useState(
    () => processor.model.surfacesMap.get(surfaceId) ?? null
  )

  useEffect(() => {
    const sub = processor.onSurfaceCreated(() => {
      setSurface(processor.model.surfacesMap.get(surfaceId) ?? null)
    })
    return () => sub.unsubscribe()
  }, [processor, surfaceId])

  if (!surface) return null
  return <A2uiSurface surface={surface} />
}
```

---

## useChat integration (addition to Phase 4)

In `useChat`, when `CustomEvent` with `name="a2ui_message"` arrives:

```typescript
case EventType.CUSTOM:
  if (event.name === 'a2ui_message') {
    const surfaceId = event.value?.createSurface?.surfaceId
    feedA2uiMessage(event.value)
    if (surfaceId) {
      // Attach surfaceId to current assistant message
      setMessages(prev => prev.map(m =>
        m.id === currentMsgId ? { ...m, a2uiSurfaceId: surfaceId } : m
      ))
    }
  }
  break
```

In `ChatPanel`, render `A2uiSurfaceRenderer` below the message bubble when `a2uiSurfaceId` is set:

```tsx
<ChatBubble message={msg} />
{msg.a2uiSurfaceId && (
  <A2uiSurfaceRenderer surfaceId={msg.a2uiSurfaceId} />
)}
```

---

## Notes

- `catalogId: 'chat-wiki-catalog'` must match exactly between SKILL.md and `new Catalog(id, ...)`
- `basicCatalog` can be included alongside custom catalog if agent needs fallback primitives
- A2UI surfaces persist in `MessageProcessor` state — scrolling back shows them
- Reset `MessageProcessor` on New Chat (via `resetProcessor()`)
- CSS for custom components lives in `frontend/components/a2ui/` — style to match app dark theme
