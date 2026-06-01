# Chat Agent — Implementation Plan

## Overview

Main conversational agent for Chat Wiki. Handles Q&A grounded in user's knowledge base, conflict-aware retrieval, HITL conflict resolution, and generative UI via A2UI subagent.

## Architecture

```
Frontend (useChat hook)
  ↕ AG-UI SSE  (@ag-ui/client HttpAgent)
FastAPI POST /agent/chat
  ↕ ag_ui_langgraph
LangGraph Main DeepAgent
  ├── Tools: search_documents, get_wiki_page, search_chunks, check_conflicts, resolve_conflict
  └── Subagent: ui_renderer (A2UI)
        └── Skill: /skills/a2ui/SKILL.md
```

## Phases

| Phase | Scope | File |
|---|---|---|
| 1 | Backend — DB queries + retrieval tools | [backend-tools.md](./backend-tools.md) |
| 2 | Backend — Main agent + HITL interrupt | [backend-agent.md](./backend-agent.md) |
| 3 | Backend — A2UI subagent + skill file | [backend-a2ui.md](./backend-a2ui.md) |
| 4 | Frontend — `useChat` hook + AG-UI wiring | [frontend-chat.md](./frontend-chat.md) |
| 5 | Frontend — HITL fixed card component | [frontend-hitl.md](./frontend-hitl.md) |
| 6 | Frontend — A2UI catalog + renderer setup | [frontend-a2ui.md](./frontend-a2ui.md) |

## Key Decisions

- **Transport**: `ag_ui_langgraph` `add_langgraph_fastapi_endpoint` — handles LangGraph → AG-UI SSE conversion
- **Thread model**: `thread_id = f"{user_id}-{timestamp}"` — enforced server-side from JWT, New Chat = new timestamp
- **Checkpointer**: `MemorySaver` for MVP
- **Model**: `openai:gpt-5.4-nano-2026-03-17` (same as docs processor)
- **HITL**: `interrupt()` inside `resolve_conflict` tool — one interrupt per run max
- **A2UI transport**: `get_stream_writer()` in ui_renderer → AG-UI `CustomEvent(name="a2ui_message")` → `MessageProcessor`
- **No CopilotKit**: manual `@a2ui/react` + `@a2ui/web_core` wiring
