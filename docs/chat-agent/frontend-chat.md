# Phase 4 — Frontend: useChat Hook + AG-UI Wiring

## Files to create/modify

- `frontend/lib/hooks/useChat.ts` — NEW: owns HttpAgent, message state, interrupt state
- `frontend/lib/agui.ts` — NEW: HttpAgent factory
- `frontend/store/useAppStore.ts` — add chat message state
- `frontend/components/ChatPanel.tsx` — wire up useChat hook (existing component)

---

## Hook: `frontend/lib/hooks/useChat.ts`

### Responsibilities
- Creates/reuses `HttpAgent` instance pointing at `/agent/chat`
- Manages `messages[]` — chat history rendered in panel
- Manages `pendingInterrupt` — HITL card state when agent pauses
- Exposes `sendMessage(text: string)` — starts or continues a run
- Exposes `resumeInterrupt(payload: ResumePayload)` — sends user's HITL decision
- Exposes `newChat()` — generates new thread_id, clears messages

### State shape

```typescript
type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string           // accumulated text
  a2uiSurfaceId?: string    // if this message has an A2UI surface
}

type PendingInterrupt = {
  run_id: string
  thread_id: string
  conflict_id: string
  conflict_type: 'duplicate' | 'outdated' | 'contradictory'
  recommendation: string
  documents: Array<{
    id: string
    title: string
    role: 'outdated' | 'current' | 'conflicting'
    conflicting_excerpt: string
    created_at: string
  }>
}

type ResumePayload = {
  action: 'approve' | 'reject' | 'modify'
  preferred_document_id?: string
  notes?: string
}
```

### AG-UI event handling

```typescript
// TextMessageChunk → accumulate into current assistant message
// RUN_FINISHED with interrupt outcome → set pendingInterrupt
// CustomEvent name="a2ui_message" → feed to MessageProcessor
// RUN_FINISHED success → clear loading state
// RUN_ERROR → show error in message
```

### Thread ID

```typescript
// Stored in component state or appStore
// Format: `${user_id}-${Date.now()}`
// newChat() generates fresh timestamp → new thread
// user_id comes from Supabase session
```

---

## AG-UI client factory: `frontend/lib/agui.ts`

```typescript
import { HttpAgent } from '@ag-ui/client'

export function createChatAgent(backendUrl: string) {
  return new HttpAgent({
    url: `${backendUrl}/agent/chat`,
  })
}
```

Token injected via `Authorization` header — check how `@ag-ui/client` `HttpAgent` accepts custom headers. May need to pass headers in `RunAgentInput` or configure agent with auth interceptor.

---

## AppStore additions

Add to `useAppStore`:

```typescript
// Chat state
messages: ChatMessage[]
setMessages: (msgs: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void
clearMessages: () => void
```

OR keep message state local to `useChat` hook (not global store) — messages only needed in ChatPanel, no cross-panel sharing needed.

**Recommended**: local to `useChat` — no store pollution, simpler.

---

## ChatPanel wiring

```tsx
export default function ChatPanel() {
  const { messages, pendingInterrupt, isLoading, sendMessage, resumeInterrupt, newChat } = useChat()
  
  // Render:
  // - messages[] as chat bubbles
  // - A2uiSurface inline when message has a2uiSurfaceId
  // - HitlCard when pendingInterrupt != null
  // - Input box → sendMessage()
  // - New Chat button → newChat()
}
```

---

## Dependencies to install

```bash
pnpm add @ag-ui/client
# Already in package.json — verify version supports CustomEvent handling
```

---

## Notes

- `HttpAgent` from `@ag-ui/client` — check if it supports streaming `CustomEvent` out of the box or requires subscribing to raw event stream
- Auth: Supabase JWT must be in `Authorization: Bearer <token>` header on every request to `/agent/chat`
- `isLoading` state: true between `RUN_STARTED` and `RUN_FINISHED`/`RUN_ERROR`
