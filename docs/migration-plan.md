# Frontend Design Migration Plan

Migrate all UI from `chat-wiki/` prototype into `frontend/` Next.js app.

## Analysis

### Design mock has (not yet in Next.js)

| Area | Mock | Current Next.js |
|------|------|-----------------|
| Shell layout | CSS grid + `--left-w` var + resizer + collapse | Flex, fixed 280px, no resizer |
| CSS approach | Class-based system (`panel`, `shell`, `msg-row`, etc.) | Inline styles everywhere |
| LeftPanel | Upload zone + material list + section heads + detail view + resolver bar | Basic stub |
| MaterialRow | File icon colors, status badge, row menu, progress rail, floating tooltip | Basic stub |
| ChatPanel | Panel header, typing indicator, input textarea, scope chip, suggestions | No input, no suggestions |
| MessageItem | user/agent/hitl/typing/a2ui variants | user/agent only |
| HITL card | Full conflict resolution card | Missing |
| A2UI card | Generic data card | Missing |
| Markdown | Custom renderer (headings, bold, code, cites) | Missing |
| ConfirmDialog | Modal w/ keyboard support | Missing |
| Resizer | Drag-to-resize + localStorage persist | Missing |
| Store | leftCollapsed, leftPanelView, selectedDocId, rich Doc type | Minimal |
| Sign-in page | ✅ Already migrated | ✅ |
| CSS vars | ✅ Already in globals.css | ✅ |
| Fonts | ✅ Syne + DM Mono | ✅ |

---

## Phases

### Phase 1 — CSS classes → globals.css
**Files:** `frontend/app/globals.css`

Port all CSS classes from `chat-wiki/styles.css` into globals.css:
- Layout: `.shell`, `.shell-inner`, `.resizer`, `.panel`, `.panel-header`
- Header: `.app-header`, `.brand-block`, `.brand`, `.ghost-btn`, `.icon-btn`, `.hamburger`, `.theme-toggle`, `.account-wrap`, `.account-menu`
- Left panel: `.upload-zone`, `.material-list-wrap`, `.list-section-head`, `.material-list`, `.material-row`, `.status-badge`, `.conflict-dot`, `.row-menu`, `.row-menu-btn`, `.progress-rail`, `.floating-tip`, `.resolver-bar`, `.resolver-btn`
- Detail view: `.detail-view`, `.detail-head`, `.detail-tabs`, `.detail-tab`, `.detail-body`, `.entity-chip`, `.entity-grid`, `.kv-grid`, `.detail-raw`
- Chat: `.chat-body`, `.msg-row`, `.msg-bubble`, `.md`, `.cite`, `.sources-row`, `.source-pill`, `.typing`, `.followup-tray`, `.suggestion-tray`, `.suggestion-chip`
- Cards: `.hitl-card`, `.hitl-head`, `.hitl-body`, `.hitl-sources`, `.hitl-source`, `.hitl-btn`, `.a2ui-card`, `.a2ui-head`, `.a2ui-body`, `.a2ui-rows`
- Input: `.chat-input-wrap`, `.chat-input`, `.chat-input-bottom`
- Dialog: `.confirm-backdrop`, `.confirm-card`, `.confirm-head`, `.confirm-actions`
- Misc: `.popover`, `.empty`, `.collapse-btn`, `.back-btn`
- Animations: `cardIn`, `spin`, `menuIn`, `pulse`, `bounce`, `tipIn`
- Mobile: `@media (max-width: 880px)` drawer rules

**Verify:** `pnpm build` passes. Grain texture, scrollbar, focus ring visible.

---

### Phase 2 — Shared types + Icons
**Files:** `frontend/lib/types.ts`, `frontend/components/Icons.tsx`

`types.ts` — define interfaces:
```ts
Document { id, title, fileType, status, progress?, stage?, hasConflict, pages, addedAt, size, wiki?, raw?, failReason? }
WikiContent { summary, concepts, entities, retrieval }
Message { id, role: 'user'|'agent'|'typing'|'hitl', content?, md?, ts, sources?, a2ui?, ... }
HITLSource { id, role, name, date, claim }
A2UIPayload { schema, title, rows: {k,v}[] }
```

`Icons.tsx` — shared SVG icon components matching the design:
- Plus, Send, Upload, More, Back, Menu, Check, Alert, Sparkle, Sun, Moon, LogOut, ChevronLeft, ChevronRight, Link, Eye, Trash

---

### Phase 3 — Store expansion
**Files:** `frontend/store/useAppStore.ts`

Add to store:
- `leftCollapsed: boolean` + `setLeftCollapsed`
- `leftPanelView: 'list' | 'detail'` + `setLeftPanelView`
- `selectedDocId: string | null` + `setSelectedDocId`
- `openDocument(id)` — sets view to detail + sets selectedDocId
- `backToList()` — resets to list view
- Expand `Document` type to full interface from Phase 2
- Expand `Message` type to full interface from Phase 2

---

### Phase 4 — TwoPanelShell (layout)
**Files:** `frontend/components/TwoPanelShell.tsx`

- Shell → `<div className="shell">` + `<div className="shell-inner">` CSS grid
- `--left-w` CSS var drives left column width (default 520px)
- `left-collapsed` class on shell-inner collapses left to 64px
- AppHeader → `.app-header` CSS classes: brand dot, tagline, account dropdown with avatar (`YK` initials), theme toggle
- Mobile backdrop + drawer from store `isMobileDrawerOpen`

---

### Phase 5 — Resizer component
**Files:** `frontend/components/Resizer.tsx` (new)

Port drag-resize from `app.jsx`:
- `onMouseDown` → sets `--left-w` CSS var via `document.documentElement.style.setProperty`
- Clamp: min 280px, max `containerWidth - 320 - 8`
- `localStorage.setItem('cw:left-w', px)` on mouse up
- Restore saved width on mount
- Double-click → reset to 520px
- `body.resizing` class during drag

---

### Phase 6 — UploadZone
**Files:** `frontend/components/UploadZone.tsx`

Port to `.upload-zone` CSS classes:
- `drag` state class on dragover
- Hidden `<input type="file" multiple>`
- Click → trigger input
- Props: `onFiles(files: File[])` callback

---

### Phase 7 — MaterialRow + DetailView
**Files:** `frontend/components/MaterialRow.tsx`, `frontend/components/DetailView.tsx` (new)

`MaterialRow`:
- `FileIcon` component — SVG page glyphs per type (pdf/md/txt/pptx/img) with type color classes (`ftype-pdf`, etc.)
- Overlay marks: fail mark (✕), conflict mark (alert icon)
- `StatusBadge` sub-component — uploading/processing/ready/failed pills
- Row menu (open/download/re-ingest/delete) — appears on hover
- Progress rail — shown when `status === 'processing' | 'uploading'`
- Floating tooltip — fixed-position, shown 320ms after hover, for failed/conflict rows
- Props: `doc: Document`, `active`, `onClick`, `onDelete`, `collapsed`

`DetailView`:
- Back button → `backToList()`
- Title + meta pills (type, size, pages, added, conflict flag)
- Tabs: Wiki / Raw / Metadata
- Wiki tab: summary, concepts chips, entities grid, retrieval hints
- Raw tab: source excerpt in `.detail-raw`
- Metadata tab: `.kv-grid` key-value pairs

---

### Phase 8 — LeftPanel
**Files:** `frontend/components/LeftPanel.tsx`

Port to `.panel.left-panel`:
- Panel header: "Sources" label, live dot, `ready/total` count, collapse button (ChevronLeft/Right)
- Upload zone
- Section header: "library" + count badge + "↓ recent" sort label
- Material list with `MaterialRow` items
- Resolver bar (only when `activeConflicts.length > 0`): conflict count badge, trigger button
- Detail view when `leftPanelView === 'detail'`
- Animate processing docs progress via `setInterval` (900ms)

---

### Phase 9 — Markdown + SourcePill
**Files:** `frontend/components/Markdown.tsx` (new), `frontend/components/SourcePill.tsx` (new)

`Markdown`:
- Block parser: h1/h2/h3 (`# ## ###`), ul (`- *`), blockquote (`> `), hr (`---`), paragraph
- Inline: `**bold**`, `*italic*`, `` `code` ``, `[[N]](#sN)` citations → `<span className="cite">`
- Props: `md: string`, `onCite(idx)`, `sources`

`SourcePill`:
- Hover → show `.popover` with snippet + location + "click to open"
- Click → `onOpen(docId)`

---

### Phase 10 — HITLCard + A2UICard
**Files:** `frontend/components/HITLCard.tsx` (new), `frontend/components/A2UICard.tsx` (new)

`HITLCard`:
- Source picker (two `.hitl-source` cards, click to select)
- Recommendation block (`.hitl-recommend`)
- Actions: "Use this one" (primary) / "Change something" / "Skip" (danger)
- Resolved state: green card with confirmation text
- Props: `msg: HITLMessage`, `onResolve(picked: string)`

`A2UICard`:
- Header with "quick summary" + schema name
- Key-value grid (`.a2ui-rows`)
- Props: `payload: A2UIPayload`

---

### Phase 11 — MessageItem
**Files:** `frontend/components/MessageItem.tsx`

Port all 4 variants:
- `user` — right-aligned bubble
- `typing` — three-dot bounce animation
- `hitl` — full width, orange `who` label, `HITLCard`
- `agent` — `Markdown` + optional `A2UICard` + sources row (`SourcePill`s) + follow-up tray (suggestion chips)

Follow-up chips attach to last agent message only (when not streaming).

---

### Phase 12 — ChatPanel
**Files:** `frontend/components/ChatPanel.tsx`

Port to `.panel.chat-panel`:
- Panel header: "Chat" label + "New Chat" ghost button (primary variant)
- Chat body: scroll-to-bottom on message change
- Chat input: `<textarea>` auto-resize (min 22px, max 132px), `Enter` sends, `Shift+Enter` newline
- Input bottom row: scope chip (ready count), hint text (`⏎ send · ⇧⏎ newline`), send button (disabled when empty/streaming)
- Suggestion tray: horizontal scroll, chips above input
- `isStreaming` state → disables input, shows `retrieving…` placeholder

---

### Phase 13 — ConfirmDialog
**Files:** `frontend/components/ConfirmDialog.tsx` (new)

Port confirm dialog:
- Backdrop (`confirm-backdrop`) → click outside = cancel
- `Escape` = cancel, `Enter` = confirm (keyboard listeners)
- Focus cancel button on open
- Props: `state: { open, title, message, confirmText, cancelText, danger, resolve(bool) } | null`
- Danger variant: red confirm button + trash icon

Expose `requestConfirm(opts)` via store or context (returns `Promise<boolean>`).

---

### Phase 14 — Smoke test
**Commands:** `pnpm build`, `pnpm lint`

Golden path verification:
1. Sign-in page renders correctly (light + dark)
2. Main app: left panel shows Sources with upload zone
3. Upload a file → uploading → processing → ready status cycle
4. Ask a question → typing indicator → agent response with markdown
5. Source pill hover → popover visible
6. HITL card → pick source → resolve → green confirmed state
7. Collapse left panel → icon-only rail
8. Drag resizer → left panel resizes + persists on reload
9. Mobile: hamburger → drawer → backdrop closes it
10. New Chat → confirm dialog → clears messages

---

## Key Constraints

- CSS class-based (not inline styles) — matches design tokens, avoids hydration issues
- All new components are `'use client'` — they're interactive
- Sign-in page (`frontend/app/sign-in/page.tsx`) — **do not touch**, already correct
- `globals.css` gets all classes — single source of truth for styles
- Never directly edit `pyproject.toml` — unrelated but noted
