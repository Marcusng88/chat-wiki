# Phase 1: Frontend Changes

---

## 1. Install packages

```bash
cd frontend
pnpm add @a2ui/react @a2ui/web_core
```

---

## 2. Create `frontend/lib/a2uiProcessor.ts`

Module-level singleton. Keeps the `MessageProcessor` alive across renders.
`resetA2uiProcessor()` is called when the user starts a new chat.

```typescript
import { MessageProcessor } from '@a2ui/web_core/v0_9'
import { basicCatalog } from '@a2ui/react/v0_9'

let _processor = new MessageProcessor([basicCatalog])

export function getA2uiProcessor(): MessageProcessor<typeof basicCatalog extends { components: infer C } ? C : never> {
  return _processor as any // eslint-disable-line @typescript-eslint/no-explicit-any
}

export function resetA2uiProcessor(): void {
  _processor = new MessageProcessor([basicCatalog])
}
```

> **Note:** The generic typing on `MessageProcessor` is complex. Using `as any` for the
> return type is intentional — the `A2uiSurface` component accepts the surface model
> from `processor.model.getSurface()` directly, and TypeScript will still catch errors
> at the usage site.

---

## 3. Update `frontend/lib/types.ts`

Change `A2UIMessage` — remove `component` and `data`, add `surfaceId`:

```typescript
// BEFORE:
export interface A2UIMessage {
  id: string
  role: 'a2ui'
  ts: string
  component: string
  data: Record<string, unknown>
}

// AFTER:
export interface A2UIMessage {
  id: string
  role: 'a2ui'
  ts: string
  surfaceId: string
}
```

No other changes to `types.ts`.

---

## 4. Update `frontend/lib/hooks/useChat.ts`

Full file replacement:

```typescript
'use client'
import { useCallback, useRef } from 'react'
import { EventType } from '@ag-ui/client'
import { createChatAgent } from '@/lib/agentClient'
import { createClient } from '@/lib/supabase'
import { useAppStore } from '@/store/useAppStore'
import { getA2uiProcessor } from '@/lib/a2uiProcessor'
import type { AgentMessage, A2UIMessage, HITLMessage } from '@/lib/types'

const CONFLICT_LABELS: Record<string, string> = {
  duplicate: 'Duplicate content',
  outdated: 'Outdated document',
  contradictory: 'Contradictory information',
}

function nowTs() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function useChat() {
  const textBuf = useRef<Record<string, string>>({})
  const suppressMsg = useRef<Set<string>>(new Set())

  const makeHandlers = useCallback(() => {
    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      next(event: any) {
        const { addMessage, updateMessage, setMessages, setIsStreaming, setPendingHITL } =
          useAppStore.getState()

        switch (event.type) {
          case EventType.TEXT_MESSAGE_START: {
            if (suppressMsg.current.has('next')) {
              suppressMsg.current.delete('next')
              suppressMsg.current.add(event.messageId)
              break
            }
            textBuf.current[event.messageId] = ''
            setMessages((m) => [
              ...m.filter((x) => x.role !== 'typing'),
              {
                id: event.messageId,
                role: 'agent',
                ts: nowTs(),
                md: '',
                sources: [],
              } satisfies AgentMessage,
            ])
            break
          }

          case EventType.TEXT_MESSAGE_CONTENT: {
            if (suppressMsg.current.has(event.messageId)) break
            textBuf.current[event.messageId] =
              (textBuf.current[event.messageId] ?? '') + event.delta
            updateMessage(event.messageId, { md: textBuf.current[event.messageId] })
            break
          }

          case EventType.TEXT_MESSAGE_END: {
            suppressMsg.current.delete(event.messageId)
            delete textBuf.current[event.messageId]
            break
          }

          case EventType.CUSTOM: {
            if (event.name === 'on_interrupt') {
              const val = event.value as Record<string, unknown>
              const conflictType = (val.conflict_type as string) ?? ''
              const docs = (
                val.documents as Array<{ id: string; title: string; created_at: string }>
              ) ?? []
              setMessages((m) => m.filter((x) => x.role !== 'typing'))
              addMessage({
                id: 'hitl-' + (val.conflict_id as string),
                role: 'hitl',
                ts: nowTs(),
                conflictType,
                title: CONFLICT_LABELS[conflictType] ?? conflictType,
                explanation: '',
                sources: docs.map((d) => ({ id: d.id, name: d.title, date: d.created_at })),
                recommend: (val.recommendation as string) ?? '',
              } satisfies HITLMessage)
              setPendingHITL(true)
              break
            }

            if (event.name !== 'a2ui_message') break

            const val = event.value as Record<string, unknown>
            const processor = getA2uiProcessor()

            if (val.createSurface) {
              const { surfaceId } = val.createSurface as { surfaceId: string }
              processor.processMessages([val as any]) // eslint-disable-line @typescript-eslint/no-explicit-any
              addMessage({
                id: 'a2ui-' + surfaceId,
                role: 'a2ui',
                ts: nowTs(),
                surfaceId,
              } satisfies A2UIMessage)
            } else if (val.updateComponents) {
              processor.processMessages([val as any]) // eslint-disable-line @typescript-eslint/no-explicit-any
            } else if (val.updateDataModel) {
              processor.processMessages([val as any]) // eslint-disable-line @typescript-eslint/no-explicit-any
              suppressMsg.current.add('next')
            }
            break
          }

          case EventType.RUN_FINISHED: {
            setMessages((m) => m.filter((x) => x.role !== 'typing'))
            suppressMsg.current.clear()
            setIsStreaming(false)
            break
          }

          case EventType.RUN_ERROR: {
            setMessages((m) => [
              ...m.filter((x) => x.role !== 'typing'),
              {
                id: 'err' + Date.now(),
                role: 'agent',
                ts: nowTs(),
                md: 'Something went wrong. Try again.',
                sources: [],
              } satisfies AgentMessage,
            ])
            suppressMsg.current.clear()
            setIsStreaming(false)
            break
          }
        }
      },

      error() {
        const { setMessages, setIsStreaming } = useAppStore.getState()
        setMessages((m) => [
          ...m.filter((x) => x.role !== 'typing'),
          {
            id: 'err' + Date.now(),
            role: 'agent',
            ts: nowTs(),
            md: 'Something went wrong. Try again.',
            sources: [],
          } satisfies AgentMessage,
        ])
        setIsStreaming(false)
      },
    }
  }, [])

  const send = useCallback(async (text: string) => {
    const { messages, threadId, addMessage, setIsStreaming } = useAppStore.getState()

    const ts = nowTs()
    const userMsgId = 'u' + Date.now()

    addMessage({ id: userMsgId, role: 'user', content: text, ts })
    addMessage({ id: 'typing', role: 'typing' })
    setIsStreaming(true)

    const agMessages = [
      ...messages
        .filter((m) => m.role === 'user' || m.role === 'agent')
        .map((m) => ({
          id: m.id,
          role: m.role === 'user' ? ('user' as const) : ('assistant' as const),
          content:
            m.role === 'user'
              ? (m as { content: string }).content
              : (m as AgentMessage).md ?? '',
        })),
      { id: userMsgId, role: 'user' as const, content: text },
    ]

    const supabase = createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()
    const token = session?.access_token ?? ''

    const agent = createChatAgent(token)

    const sub = agent
      .run({
        threadId: threadId ?? crypto.randomUUID(),
        runId: 'r' + Date.now(),
        messages: agMessages,
        state: {},
        tools: [],
        context: [],
        forwardedProps: {},
      })
      .subscribe(makeHandlers())

    return () => sub.unsubscribe()
  }, [makeHandlers])

  const resolveHITL = useCallback(
    async (action: string, preferredDocId?: string, notes?: string) => {
      const { threadId, addMessage, setIsStreaming, setPendingHITL } = useAppStore.getState()

      setPendingHITL(false)
      addMessage({ id: 'typing', role: 'typing' })
      setIsStreaming(true)

      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const token = session?.access_token ?? ''

      const agent = createChatAgent(token)

      const sub = agent
        .run({
          threadId: threadId ?? crypto.randomUUID(),
          runId: 'r' + Date.now(),
          messages: [],
          state: {},
          tools: [],
          context: [],
          forwardedProps: {
            command: {
              resume: {
                action,
                preferred_document_id: preferredDocId ?? null,
                notes: notes ?? null,
              },
            },
          },
        })
        .subscribe(makeHandlers())

      return () => sub.unsubscribe()
    },
    [makeHandlers],
  )

  return { send, resolveHITL }
}
```

**Key changes from original:**
- Removed `A2UIBuffer` interface and `a2uiBuf` ref
- Removed `agentMsgsBefore` buffering and agent-message filtering logic
- Added `getA2uiProcessor()` import
- On `createSurface`: feed to processor + add `A2UIMessage` with `surfaceId` immediately
- On `updateComponents`: feed to processor only
- On `updateDataModel`: feed to processor + set `suppressMsg.add('next')`

---

## 5. Rewrite `frontend/components/A2UIRenderer.tsx`

Full file replacement:

```tsx
'use client'
import { useState, useEffect } from 'react'
import { A2uiSurface } from '@a2ui/react/v0_9'
import { getA2uiProcessor } from '@/lib/a2uiProcessor'

interface Props {
  surfaceId: string
}

export default function A2UIRenderer({ surfaceId }: Props) {
  const [surface, setSurface] = useState(
    () => getA2uiProcessor().model.getSurface(surfaceId)
  )

  useEffect(() => {
    const processor = getA2uiProcessor()
    // Sync in case surface was created before component mounted
    if (!surface) {
      setSurface(processor.model.getSurface(surfaceId))
    }
    // Listen for re-creation (e.g. after chat reset)
    const sub = processor.onSurfaceCreated((s) => {
      if (s.id === surfaceId) setSurface(s)
    })
    return () => sub.unsubscribe()
  }, [surfaceId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!surface) {
    return (
      <div className="a2ui-loading">
        <span className="a2ui-loading-dot" />
      </div>
    )
  }

  return <A2uiSurface surface={surface} />
}
```

**`A2uiSurface` is internally reactive** — it subscribes to the surface model and
re-renders when `updateComponents` or `updateDataModel` messages arrive.
No manual state management needed beyond getting the surface object.

---

## 6. Update `frontend/components/MessageItem.tsx`

Change the `a2ui` branch only. Replace:

```tsx
// BEFORE:
<A2UIRenderer component={msg.component} data={msg.data} onOpenDoc={onOpenDoc} onQuery={onQuery} />

// AFTER:
<A2UIRenderer surfaceId={msg.surfaceId} />
```

The `onOpenDoc` and `onQuery` callbacks are no longer passed through — the official
renderer handles interaction events differently (via A2UI action system if needed).
For this release, the surfaces are display-only.

---

## 7. Update `frontend/store/useAppStore.ts`

Add `resetA2uiProcessor()` call inside `clearMessages`:

```typescript
// Add import at top:
import { resetA2uiProcessor } from '@/lib/a2uiProcessor'

// Update clearMessages:
clearMessages: async () => {
  resetA2uiProcessor()                          // ← add this line
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const userId = session?.user?.id ?? 'anon'
  set({ messages: [], threadId: `${userId}-${Date.now()}` })
},
```

---

## 8. Update `frontend/app/layout.tsx`

Add two things:

### a) Material Symbols font `<link>` in `<head>`

```tsx
<head>
  {/* existing theme script */}
  <script dangerouslySetInnerHTML={{ __html: `...` }} />
  {/* Material Symbols for A2UI Icon component */}
  <link
    rel="stylesheet"
    href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
  />
</head>
```

### b) A2UI structural CSS import

Add after existing CSS imports:

```typescript
import 'katex/dist/katex.min.css'
import 'highlight.js/styles/github-dark.css'
import '@a2ui/react/styles/structural.css'   // ← add this
```

---

## 9. Add A2UI loading state CSS to `frontend/app/globals.css`

Add at end of file:

```css
/* A2UI loading placeholder */
.a2ui-loading {
  display: flex;
  align-items: center;
  padding: 12px 0;
  gap: 4px;
}

.a2ui-loading-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--text-muted, #888);
  animation: a2ui-pulse 1s ease-in-out infinite;
}

@keyframes a2ui-pulse {
  0%, 100% { opacity: 0.3; }
  50%       { opacity: 1; }
}
```

---

## TypeScript notes

The `@a2ui/web_core/v0_9` `MessageProcessor` generic is `MessageProcessor<T extends ComponentApi>`.
When using `basicCatalog`, the type inference is deep and verbose. Using `as any` in
`processor.processMessages([val as any])` is acceptable here — the runtime validation
is handled by the processor itself; TypeScript's structural check on raw AG-UI event
values adds no safety benefit.

If the team wants full type safety, import the `A2uiMessage` type from `@a2ui/web_core/v0_9`
and cast accordingly:

```typescript
import type { A2uiMessage } from '@a2ui/web_core/v0_9'
processor.processMessages([val as A2uiMessage])
```
