# OpenUI Migration Plan (Revised)

Replace A2UI with OpenUI for generative UI rendering in the chat panel.

---

## Why OpenUI

| Concern | A2UI | OpenUI |
|---|---|---|
| Component richness | 18 basic primitives, no charts | Stack, Card, Table, Chart, Form, Button, Tabs, Badge + more |
| Agent output format | Complex JSON adjacency list | openui-lang: readable assignment DSL, output inline as text |
| Validation complexity | 165-line Python validator | None — Renderer parses internally, `onError` callback for errors |
| Streaming | 3 CUSTOM events per render | Regular TEXT stream, progressive rendering built-in |
| Theme support | Manual CSS var mapping | CSS imports + CSS custom properties |
| Tool/subagent overhead | `render_ui` tool + subagent delegation | No tool, no subagent — agent outputs text directly |

---

## Key Architecture Insight

OpenUI's native model: **LLM outputs openui-lang inline as regular text.** No tool call. No subagent. No CUSTOM event. The text flows through existing AG-UI `TEXT_MESSAGE_CONTENT` events into `TextBlock.md`. The frontend detects openui-lang and feeds it to `<Renderer>`.

```
Main agent (has OpenUI system prompt)
→ outputs openui-lang as text when visual needed
→ AG-UI TEXT_MESSAGE_CONTENT chunks → TextBlock.md
→ MessageItem: isOpenUILang(block.md) → <OpenUIRenderer> instead of markdown
```

AG-UI remains the transport. OpenUI is the content format. They operate at different layers and are independently needed.

---

## Packages

```bash
# Frontend only — no backend Python changes
pnpm add @openuidev/react-ui @openuidev/react-headless @openuidev/react-lang
```

Requirements: React 19+ ✅ (project is on 19.2.4), zustand ✅ (already installed)

**Do not add `@langchain/react`** — its `useStream` requires LangGraph Server at port 2024, incompatible with this project's FastAPI + AG-UI SSE transport.

---

## Architecture Decisions

| Decision | Choice | Reason |
|---|---|---|
| Transport | Keep AG-UI SSE | Existing infrastructure; `react-headless` has built-in AG-UI adapter |
| render_ui tool | **Delete entirely** | Not needed — openui-lang flows as regular text |
| UI subagent | **Delete entirely** | Not needed — main agent outputs openui-lang directly |
| OpenUIBlock type | **Not needed** | openui-lang lives in `TextBlock.md`, detected at render time |
| System prompt | Generate once → inject into main agent | `openuiLibrary.prompt()` is JS; run generation script, commit output |
| Delivery mode | Inline text stream | Native OpenUI model; no CUSTOM event needed for UI |
| Button actions | Wire `onAction` + `continue_conversation` | 5 lines, UX gain for knowledge navigation |
| HITL CUSTOM event | Unchanged | `on_interrupt` stays exactly as-is |

---

## System Prompt Generation

`openuiLibrary.prompt()` is a JS function. Run once after `pnpm add`, commit output to backend:

```bash
# From frontend/ directory, after pnpm install
node -e "
import('@openuidev/react-ui/genui-lib').then(({ openuiLibrary, openuiPromptOptions }) => {
  console.log(openuiLibrary.prompt(openuiPromptOptions))
})
" > ../backend/app/agents/chat/openui_system_prompt.txt
```

Regenerate when `@openuidev/react-ui` version bumps.

---

## Backend Changes

### 1. Delete `render_ui.py`

```
DELETE: backend/app/agents/chat/tools/render_ui.py
DELETE: backend/app/agents/chat/subagents/a2ui.py
DELETE: backend/app/agents/chat/subagents/AGENTS.md
DELETE: backend/app/agents/chat/skills/a2ui/          (entire directory)
DELETE: backend/tests/test_render_ui.py
```

### 2. `agent.py` — remove A2UI subagent + inject OpenUI prompt

`create_deep_agent` takes `memory=[]` (list of file paths), not a `system_prompt` param.
Add the generated prompt file alongside the existing AGENTS.md:

```python
# Remove:
from app.agents.chat.subagents import A2UI_SUBAGENT

# Add:
_OPENUI_PROMPT_FILE = str(Path(__file__).parent / "openui_system_prompt.txt")

graph = create_deep_agent(
    model=get_llm(),
    tools=[...],
    subagents=[],                                    # remove A2UI_SUBAGENT
    memory=[_AGENTS_MD, _OPENUI_PROMPT_FILE],        # add openui prompt file
    ...
)
```

### 3. `subagents/__init__.py` — clear or delete

Currently imports `A2UI_SUBAGENT` — will break after `a2ui.py` is deleted:

```python
# Delete file or replace with:
__all__ = []
```

---

## Frontend Changes

### 1. `lib/types.ts`

```ts
// Remove A2UIBlock entirely
// Block is now just TextBlock

export type Block = TextBlock
// Delete: A2UIBlock interface
```

### 2. `lib/hooks/useChat.ts`

Remove `a2ui_message` branch and `a2uiProcessor` import:

```ts
// Remove this import:
import { getA2uiProcessor } from '@/lib/a2uiProcessor'

// In EventType.CUSTOM handler — keep only on_interrupt:
case EventType.CUSTOM: {
  if (event.name === 'on_interrupt') {
    // ... HITL logic unchanged ...
  }
  break
}

// Remove entirely:
// - if (event.name !== 'a2ui_message') break
// - val.createSurface / updateComponents / updateDataModel branches
// - processor.processMessages() calls
// - addBlock(turnId, { type: 'a2ui', surfaceId }) call
```

### 3. `store/useAppStore.ts`

```ts
// Remove this import:
import { resetA2uiProcessor } from '@/lib/a2uiProcessor'

// In clearMessages():
clearMessages: async () => {
  // Remove: resetA2uiProcessor()
  const supabase = createClient()
  // ... rest unchanged
}
```

### 4. `components/OpenUIRenderer.tsx` — new file

```tsx
'use client'
import { Renderer } from '@openuidev/react-lang'
import { openuiLibrary } from '@openuidev/react-ui/genui-lib'

interface Props {
  content: string
  isStreaming?: boolean
  onAction?: (event: unknown) => void
}

export default function OpenUIRenderer({ content, isStreaming = false, onAction }: Props) {
  return (
    <Renderer
      response={content}
      library={openuiLibrary}
      isStreaming={isStreaming}
      onAction={onAction}
    />
  )
}
```

### 5. `components/MessageItem.tsx`

Detect openui-lang in TextBlock at render time — no new block type needed:

```tsx
import OpenUIRenderer from './OpenUIRenderer'

function isOpenUILang(text: string): boolean {
  return /^\s*root\s*=/.test(text)
}

// In TextBlock render path:
block.type === 'text' && isOpenUILang(block.md) ? (
  <div key={block.id} className="openui-block">
    <OpenUIRenderer
      content={block.md}
      isStreaming={isStreaming}
      onAction={handleAction}
    />
  </div>
) : (
  // existing markdown render
)
```

`handleAction` for continue_conversation buttons:
```tsx
const handleAction = useCallback((event: unknown) => {
  const e = event as { type: string; payload?: { message?: string } }
  if (e.type === 'continue_conversation' && e.payload?.message) {
    send(e.payload.message)
  }
}, [send])
```

### 6. `app/styles/_openui.css` — new file

```css
.openui-block {
  margin: 8px 0;
  border-radius: 12px;
  overflow: hidden;
  animation: cardIn 0.2s ease;
}
```

### 7. `app/globals.css`

```css
/* Add at top (CSS @import must be first): */
@import "@openuidev/react-ui/components.css";
@import "@openuidev/react-ui/styles/index.css";

/* Replace: @import "./styles/_a2ui.css"; */
@import "./styles/_openui.css";
```

**Note**: Verify exact OpenUI CSS custom property names by inspecting
`node_modules/@openuidev/react-ui/styles/index.css` after install.
Map to project vars (`--accent`, `--panel-bg-elev`, etc.) in `.openui-block`.

### 8. Delete dead files

```
DELETE: frontend/components/A2UIRenderer.tsx
DELETE: frontend/lib/a2uiProcessor.ts
DELETE: frontend/app/styles/_a2ui.css
```

---

## Files Touched Summary

| File | Action |
|---|---|
| `backend/app/agents/chat/tools/render_ui.py` | **Delete** |
| `backend/app/agents/chat/subagents/a2ui.py` | **Delete** |
| `backend/app/agents/chat/subagents/AGENTS.md` | **Delete** |
| `backend/app/agents/chat/subagents/__init__.py` | **Clear** (remove A2UI_SUBAGENT export) |
| `backend/app/agents/chat/skills/a2ui/` | **Delete directory** |
| `backend/tests/test_render_ui.py` | **Delete** |
| `backend/app/agents/chat/openui_system_prompt.txt` | **New** (generated) |
| `backend/app/agents/chat/agent.py` | Remove A2UI import + subagents arg; add openui_system_prompt.txt to memory[] |
| `frontend/lib/types.ts` | Remove `A2UIBlock`, `Block = TextBlock` |
| `frontend/lib/hooks/useChat.ts` | Remove a2ui_message branch + processor import |
| `frontend/lib/a2uiProcessor.ts` | **Delete** |
| `frontend/store/useAppStore.ts` | Remove `resetA2uiProcessor` import + call |
| `frontend/components/A2UIRenderer.tsx` | **Delete** |
| `frontend/components/OpenUIRenderer.tsx` | **New** |
| `frontend/components/MessageItem.tsx` | Add `isOpenUILang` detection + OpenUIRenderer |
| `frontend/app/globals.css` | Swap CSS imports |
| `frontend/app/styles/_a2ui.css` | **Delete** |
| `frontend/app/styles/_openui.css` | **New** |

---

## What Did NOT Change vs Original Plan

- AG-UI SSE transport — untouched
- HITL `on_interrupt` CUSTOM event — untouched
- `useChat.ts` TEXT_MESSAGE_START/CONTENT/END handling — untouched
- `useAppStore` message/block state shape (TextBlock stays as-is)
- FastAPI endpoints — untouched
- Supabase / auth / realtime — untouched

---

## Risks

| Risk | Mitigation |
|---|---|
| `isOpenUILang` false positive (markdown starts with `root =`) | Unlikely in wiki Q&A domain; tighten regex if needed: `/^\s*root\s*=\s*\w+\s*\(/` |
| OpenUI CSS var names differ from guessed names | Inspect `node_modules/@openuidev/react-ui/styles/index.css` after install before theming |
| OpenUI system prompt token cost on every main agent turn | Unavoidable in no-subagent model; ~2-4k tokens; acceptable for hackathon |
| Agent outputs malformed openui-lang | `Renderer` `onError` callback fires — wire it to console.warn minimum |
