# Frontend PRD — Chat Wiki Two-Panel UI

Version: 1.0
Status: Ready for Implementation
Date: 2026-05-27

---

## Problem Statement

The Chat Wiki backend exposes three DeepAgent endpoints (`/agent/chat`, `/agent/ingest`, `/agent/resolve`) and a Supabase-backed knowledge store. There is no frontend yet. Users cannot upload materials, trigger ingestion, monitor processing status, interact with the Main Agent via chat, or manage conflicts through a UI.

---

## Solution

Build a Next.js App Router frontend with a two-panel layout:
- **Left panel**: material management (upload, list, detail view, conflict flags, resolver trigger)
- **Main panel**: conversational chat with the Main DeepAgent (streaming responses, HITL cards, A2UI cards, source references)

Auth is stubbed for Phase 1 (mock `user_id`). Real Supabase Auth login is deferred to a later phase.

---

## User Stories

1. As a user, I want to see a two-panel layout on load so that I can access both my materials and chat simultaneously.
2. As a user, I want to drag and drop files onto the left panel so that I can upload materials without hunting for a button.
3. As a user, I want a fallback upload button so that I can upload files on mobile where drag-and-drop is unavailable.
4. As a user, I want to see accepted file types listed near the upload zone so that I know what formats are supported.
5. As a user, I want each uploaded material shown as a compact row in the left panel so that I can scan my knowledge base at a glance.
6. As a user, I want a file type icon on each material row so that I can identify document types visually.
7. As a user, I want a color-coded status badge on each row so that I can see ingestion progress without reading text.
8. As a user, I want to hover over a truncated material title to see the full title in a tooltip so that long filenames are readable.
9. As a user, I want a 3-dot menu on each material row so that I can access actions (delete) without cluttering the row.
10. As a user, I want a delete confirmation before hard deletion so that I don't accidentally destroy knowledge.
11. As a user, I want clicking a material row to switch the left panel to a detail view showing raw extracted content so that I can inspect source material.
12. As a user, I want a back button in the detail view to return to the material list so that I can navigate without confusion.
13. As a user, I want the left panel material list to scroll independently so that I can manage many materials without layout breakage.
14. As a user, I want a Resolver button fixed at the bottom of the left panel so that I can trigger the Resolver DeepAgent at any time.
15. As a user, I want the Resolver button to show a conflict count badge (e.g. "Resolve Conflicts (3)") so that I know how many conflicts exist before clicking.
16. As a user, I want conflicted material rows to show an orange badge so that I can identify which documents are flagged.
17. As a user, I want to type a message in the chat input and press Enter to send so that interaction feels natural.
18. As a user, I want Shift+Enter to insert a newline in the chat input so that I can write multi-line messages.
19. As a user, I want the chat input to auto-grow vertically as I type so that long messages are visible without scrolling the input.
20. As a user, I want the chat input disabled while the agent is streaming so that I cannot interrupt an in-progress response.
21. As a user, I want to see a typing indicator immediately after sending a message so that I know the agent received my input.
22. As a user, I want agent responses to stream token-by-token so that I see output as it generates rather than waiting for the full response.
23. As a user, I want streamed responses rendered as markdown so that structured knowledge (lists, headings, code) is readable.
24. As a user, I want code blocks in responses to have syntax highlighting so that code content is visually distinct.
25. As a user, I want a "Sources" button below each completed agent message so that I can access the evidence behind the response.
26. As a user, I want hovering the Sources button to preview a list of source file names so that I can decide whether to inspect them.
27. As a user, I want clicking a source to switch the left panel to that material's detail view so that I can read the raw evidence without leaving the page.
28. As a user, I want a "New Chat" button in the chat panel header so that I can start a fresh conversation and clear the current thread.
29. As a user, I want HITL approval cards to appear inline in the chat flow so that conflict resolution feels part of the conversation.
30. As a user, I want HITL cards to block further input until I approve, reject, or modify so that I cannot accidentally bypass the approval step.
31. As a user, I want A2UI generic cards rendered in the chat panel so that the agent can surface structured visual outputs when useful.
32. As a user, I want the left panel to collapse to a slide-in drawer on mobile so that the chat panel is usable on small screens.
33. As a user, I want a hamburger button to toggle the left panel drawer on mobile so that I can access materials without losing my chat context.
34. As a user, I want ingestion status to update in real time on material rows so that I can track processing without refreshing.
35. As a user, I want failed materials to remain visible with a red badge so that I know which uploads need attention.

---

## Implementation Decisions

### Design System

- **Theme**: Dark, `#0a0a0a` background, `#e8e8e8` text, `#06b6d4` cyan accent
- **Fonts**: `Syne` (headers/app name, bold geometric) + `DM Mono` (body/UI, terminal feel) via `next/font/google`
- **CSS variables** for all colors — no hardcoded hex in components
- **Status badge colors**: uploading=`#6b7280`, processing=`#f59e0b`, ready=`#22c55e`, failed=`#ef4444`, conflict=`#f97316`
- No purple gradients, no Inter/Roboto, no generic AI aesthetics

### Routing

- Single route `/` — entire two-panel layout on one page
- No sub-routes for MVP
- `/login` deferred to Phase 2 (real auth)

### Auth (Stubbed)

- Mock `user_id` constant in a stub auth module
- Zustand store initialized with mock user on mount
- No JWT, no session management for Phase 1
- Real Supabase Auth plugged in Phase 2 without restructuring store

### State Management

- **Zustand** single store (`useAppStore`) with slices:
  - `documents[]` — material list with status
  - `messages[]` — chat message history
  - `activeConflicts[]` — flagged conflict IDs
  - `threadId` — current LangGraph thread
  - `leftPanelView` — `'list' | 'detail'`
  - `selectedDocumentId` — which doc is in detail view
  - `isStreaming` — agent streaming lock
  - `isMobileDrawerOpen`
- No server state library (SWR/React Query) for Phase 1 — Supabase Realtime handles doc status

### Left Panel

- Fixed `280px` width on desktop
- Two views controlled by `leftPanelView` in store:
  - **List view**: upload zone + material rows + resolver button
  - **Detail view**: raw content display + back button
- Detail view triggered by: material row click OR source button click (passes `documentId`)
- Back button resets `leftPanelView` to `'list'`

#### Upload Zone

- Drag-and-drop with `dragover` highlight state
- File input button as fallback
- Accepted types listed: PDF, MD, TXT, PPTX, Images
- Mobile: button only (drag-drop hidden on touch devices via CSS media query)
- On file select: calls FastAPI presigned URL endpoint → uploads direct to Supabase Storage → POST to FastAPI to trigger ingestion

#### Material Row

- Layout: `[file icon] [truncated title] [status badge] [3-dot menu]`
- Hover: full title tooltip via `title` attribute
- 3-dot menu: popover with "Delete" action → confirmation dialog
- Delete: hard delete via FastAPI endpoint (cascades: file + wiki + chunks + embeddings + indexes)
- Conflict badge: overlays status badge with orange `conflict` color when doc is flagged

#### Resolver Button

- Fixed at bottom of left panel
- Shows conflict count: "Resolve Conflicts" or "Resolve Conflicts (N)" when N > 0
- Click: streams to `POST /agent/resolve` via AG-UI HttpAgent
- Disabled while resolver is running

### Chat Panel

#### Header

- App name left, "New Chat" button right
- "New Chat": clears `messages[]` in store, generates new `threadId`, signals backend to drop old checkpointer state

#### Message List

- Scrollable, auto-scrolls to bottom on new message
- Message types:
  - `user` — right-aligned, plain text
  - `agent` — left-aligned, markdown rendered
  - `typing` — animated 3-dot indicator, replaced by first token
  - `hitl` — fixed HITL card component (blocks input)
  - `a2ui` — generic JSON card renderer

#### Streaming

- AG-UI `HttpAgent` connects to `POST /agent/chat`
- On `TEXT_MESSAGE_CONTENT` events: append token to current agent message string
- Re-render markdown on each chunk append
- On stream end: append Sources button to message if sources exist in AG-UI events

#### Sources Button

- Rendered below completed agent messages that carry source refs
- Hover: popover listing source file names
- Click source item: sets `leftPanelView = 'detail'`, `selectedDocumentId = id`, opens drawer on mobile

#### Chat Input

- `<textarea>` auto-grows: `min-height: 1 line`, `max-height: 6 lines`, overflow-y scroll after max
- `Enter` → send, `Shift+Enter` → newline
- Disabled + visually dimmed when `isStreaming === true`
- Clears on send

### AG-UI Integration

- `@ag-ui/client` `HttpAgent` per agent endpoint
- Main agent: `POST /agent/chat`
- Resolver agent: `POST /agent/resolve`
- Ingest agent: `POST /agent/ingest` (triggered from backend BackgroundTask, not frontend-streamed)
- Event types handled: `TEXT_MESSAGE_CONTENT`, `TOOL_CALL_START`, `TOOL_CALL_END`, `RUN_FINISHED`, `STATE_SNAPSHOT` (for HITL/A2UI cards)

### Supabase Realtime

- Subscribe to `documents` table on mount (filtered by `user_id`)
- On row update: patch `documents[]` in Zustand store
- Used for ingestion status updates only — no other Realtime use in Phase 1

### HITL Cards

- Fixed component (not A2UI renderer)
- Triggered when agent emits HITL payload via AG-UI event
- Renders: conflict explanation, involved sources, recommended action, approve/reject/modify buttons
- Approve/reject/modify: sends user decision back via AG-UI → agent resumes

### A2UI Cards

- Generic JSON renderer component
- Agent emits card schema as JSON in AG-UI event
- Frontend renders based on schema type field (e.g. `comparison`, `summary`, `source-viewer`)
- Displayed in chat flow, no interaction required

### Mobile Responsiveness

- Breakpoint: `768px`
- Below breakpoint: left panel becomes slide-in drawer, hidden by default
- Hamburger toggle in chat header (left of app name)
- Drawer overlays chat panel with backdrop
- Upload zone button-only on mobile (hide drag instruction text)

### Package Plan

- `zustand` — global state
- `react-markdown` — markdown rendering
- `remark-gfm` — GFM (tables, strikethrough)
- `rehype-highlight` — syntax highlighting
- `@supabase/supabase-js` — auth stub + Realtime
- `@ag-ui/client` — agent streaming
- `next/font/google` — Syne + DM Mono (no external font CDN)

---

## Testing Decisions

Phase 1 UI is primarily visual and integration-heavy. Testing focus:

- **Zustand store logic** — pure functions: status transitions, message append, conflict count derivation. Test in isolation with `vitest`.
- **Upload flow state** — file selection → presigned URL fetch → status update sequence. Mock fetch, assert store transitions.
- **Chat input behavior** — Enter=send, Shift+Enter=newline, disabled state. Use React Testing Library.
- **Material row actions** — 3-dot menu open, delete confirm, row click → detail view. React Testing Library.
- **Do NOT test**: streaming rendering details, AG-UI internals, Supabase Realtime callbacks (integration concerns, not unit).

Good test = tests observable state/behavior, not implementation detail. A test that breaks when renaming an internal function is a bad test.

---

## Out of Scope

- Real Supabase Auth (login/signup page, JWT session management)
- HITL card implementation (Phase 2 — requires backend HITL signal)
- A2UI card implementation (Phase 2 — requires backend A2UI schema)
- Material expanded modal (PRD section 19.1)
- Retry failed ingestion
- Multimodal file preview (images, PDF thumbnails)
- Dark/light theme toggle
- Keyboard shortcuts
- Accessibility audit

---

## Further Notes

- AG-UI docs at `docs/ag-ui-docs.txt`, A2UI docs at `docs/A2UI/`
- Backend not running yet — frontend should be buildable with mocked API responses for layout/UI work
- Supabase Realtime subscription requires real Supabase project keys — use `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`; stub the subscription if keys absent
- `leftPanelView` state machine is the core nav primitive — detail view is entered from two places (row click, source click) and exited from one (back button)
- Phase 2 additions: real auth, HITL cards, A2UI cards, material modal, resolver streaming display
