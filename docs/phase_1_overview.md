# Phase 1: Primitive-Based A2UI — Overview

## Goal

Replace the current custom 6-template A2UI catalog with the official A2UI v0.9 basic catalog,
allowing the agent to compose any UI layout from primitives at runtime instead of picking
from a fixed set of hardcoded card shapes.

---

## Architecture Decision Summary

| Decision | Choice | Rationale |
|---|---|---|
| Tool signature | `render_ui(components: list[dict], data_model: dict)` | Two explicit args → LLM makes fewer nesting errors than single opaque payload |
| Validation | Light structural: each node needs `id: str` + `component: str` (allowlisted 18) | Catches hallucinated component names without breaking valid variations |
| Data binding | JSON Pointer resolution (`/a/b/c`) via `@a2ui/web_core` | Spec-compliant; covers nested paths agent will actually use |
| `call` expressions | Skip — agent pre-formats strings into `data_model` | No date-fns/Intl evaluator needed; out of scope for a wiki chat |
| Primitives implemented | 11 of 18: Card, Column, Row, Text, Icon, Image, Divider, List, Button, Tabs, CheckBox | Covers all plausible chat-wiki layouts; excludes media/input widgets |
| Icon rendering | Google Material Symbols font (`<link>` in layout.tsx) | Zero JS bundle cost; spec uses Material Symbol names — works out of the box |
| Skill structure | Slim SKILL.md + `references/` with official spec content + chat-wiki examples | Agent reads full prop reference on demand; SKILL.md stays token-light |
| Tool name | `render_ui` (renamed from `publish_card`) | Name reflects purpose; update subagent system_prompt accordingly |
| Tool return | `"rendered (surface {surface_id})"` | Minimal confirmation; subagent already knows what it sent |
| Frontend renderer | Official `@a2ui/react` + `@a2ui/web_core` v0.9 | Saves ~200 lines of hand-rolled recursive renderer; spec-compliant out of the box |
| Processor lifecycle | Module-level singleton `lib/a2uiProcessor.ts` | Simplest access pattern; reset on new chat via `resetA2uiProcessor()` |
| `catalogId` wire format | `https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json` | Must match what `@a2ui/web_core` expects for the basicCatalog |

---

## What Changes

### Backend

| File | Action | Summary |
|---|---|---|
| `app/agents/chat/tools/publish_card.py` | **Delete** | Replaced by `render_ui.py` |
| `app/agents/chat/tools/schemas.py` | **Delete** | 6 Pydantic models no longer needed |
| `app/agents/chat/tools/render_ui.py` | **Create** | New tool: light validation + 3 A2UI events |
| `app/agents/chat/tools/__init__.py` | **No change** | `render_ui` not exported from here (used by subagent only) |
| `app/agents/chat/subagents/a2ui.py` | **Rewrite** | Import `render_ui`, new system_prompt describing primitive composition |
| `app/agents/chat/AGENTS.md` | **Update** | Delegation format: describe visual intent + pass data, not labeled field values |
| `app/agents/chat/skills/a2ui/SKILL.md` | **Rewrite** | Teach subagent to compose primitive trees; link to references |
| `app/agents/chat/skills/a2ui/references/wiki_card.md` | **Delete** | |
| `app/agents/chat/skills/a2ui/references/source_block.md` | **Delete** | |
| `app/agents/chat/skills/a2ui/references/doc_compare.md` | **Delete** | |
| `app/agents/chat/skills/a2ui/references/topic_map.md` | **Delete** | |
| `app/agents/chat/skills/a2ui/references/knowledge_panel.md` | **Delete** | |
| `app/agents/chat/skills/a2ui/references/doc_status_board.md` | **Delete** | |
| `app/agents/chat/skills/a2ui/references/catalog_guide.md` | **Create** | Official spec component prop reference (trimmed to 11 used components) |
| `app/agents/chat/skills/a2ui/references/protocol.md` | **Create** | Adjacency list format, root node rule, path binding, child/children |
| `app/agents/chat/skills/a2ui/references/examples.md` | **Create** | 5 complete chat-wiki domain examples with full component trees |

### Frontend

| File | Action | Summary |
|---|---|---|
| `frontend/package.json` / `pnpm-lock.yaml` | **Update** | `pnpm add @a2ui/react @a2ui/web_core` |
| `frontend/lib/a2uiProcessor.ts` | **Create** | Module singleton `MessageProcessor`; `resetA2uiProcessor()` for new chat |
| `frontend/lib/types.ts` | **Update** | `A2UIMessage`: remove `component + data`, add `surfaceId: string` |
| `frontend/lib/hooks/useChat.ts` | **Update** | Feed A2UI events to processor; add message on `createSurface` |
| `frontend/components/A2UIRenderer.tsx` | **Rewrite** | `<A2uiSurface surface={processor.model.getSurface(surfaceId)} />` |
| `frontend/components/MessageItem.tsx` | **Update** | Pass `surfaceId` to `A2UIRenderer` instead of `component + data` |
| `frontend/app/layout.tsx` | **Update** | Add Material Symbols `<link>` + `@a2ui/react/styles/structural.css` import |
| `frontend/store/useAppStore.ts` | **Update** | `clearMessages` calls `resetA2uiProcessor()` |

---

## Wire Format (unchanged)

The A2UI v0.9 wire format stays identical — 3 events per surface:

```
createSurface  →  { version: "v0.9", createSurface: { surfaceId, catalogId } }
updateComponents → { version: "v0.9", updateComponents: { surfaceId, components: [...] } }
updateDataModel  → { version: "v0.9", updateDataModel: { surfaceId, path: "/", value: {...} } }
```

Only `catalogId` changes: `"chat-wiki-catalog"` → `"https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json"`

---

## Supported Primitives (11)

| Component | Category | Use in chat-wiki |
|---|---|---|
| `Card` | Layout | Outer container for any surface |
| `Column` | Layout | Vertical stack of elements |
| `Row` | Layout | Horizontal arrangement |
| `List` | Layout | Scrollable repeated items |
| `Tabs` | Layout | Multi-doc or multi-section views |
| `Divider` | Layout | Visual separator |
| `Text` | Content | All text; variants: h1–h5, body, caption |
| `Icon` | Content | Material Symbol name or emoji |
| `Image` | Content | Document thumbnails or illustrations |
| `Button` | Input | Open doc, copy, follow-up actions |
| `CheckBox` | Input | Multi-select document comparison |

Excluded (not implemented): `Video`, `AudioPlayer`, `Modal`, `TextField`, `ChoicePicker`, `Slider`, `DateTimeInput`

---

## Data Flow After Phase 1

```
Main agent fetches data
  → delegates to ui_renderer via task()
    → ui_renderer reads skill files (catalog_guide.md, examples.md)
    → ui_renderer calls render_ui(components, data_model)
      → render_ui validates (id + component allowlist)
      → render_ui dispatches 3 A2UI custom events via adispatch_custom_event
        → useChat.ts receives events
          → feeds each to a2uiProcessor.processMessages([msg])
          → on createSurface: addMessage({role: 'a2ui', surfaceId})
          → on updateDataModel: suppressMsg.add('next')
            → A2UIRenderer gets surfaceId
              → <A2uiSurface surface={processor.model.getSurface(surfaceId)} />
                → official @a2ui/react renders full primitive tree
```

---

## Implementation Order

1. Backend: create `render_ui.py`, delete old files, update `a2ui.py`
2. Backend: rewrite skill files (`SKILL.md`, `references/`)
3. Backend: update `AGENTS.md` delegation format
4. Frontend: `pnpm add @a2ui/react @a2ui/web_core`
5. Frontend: create `lib/a2uiProcessor.ts`
6. Frontend: update `lib/types.ts`
7. Frontend: update `lib/hooks/useChat.ts`
8. Frontend: rewrite `components/A2UIRenderer.tsx`
9. Frontend: update `components/MessageItem.tsx`
10. Frontend: update `app/layout.tsx` + `store/useAppStore.ts`
