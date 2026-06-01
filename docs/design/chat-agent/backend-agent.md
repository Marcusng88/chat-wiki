# Phase 2 — Backend: Main Agent + FastAPI Endpoint

## Files to create/modify

- `backend/app/agents/chat/agent.py` — main agent factory
- `backend/app/agents/chat/prompts.py` — system prompt
- `backend/app/api/chat.py` — FastAPI endpoint
- `backend/main.py` — register `/agent/chat` router

---

## Agent factory: `backend/app/agents/chat/agent.py`

```python
from langgraph.checkpoint.memory import MemorySaver
from deepagents import create_deep_agent
from app.utils.model_provider import get_llm
from app.agents.chat.tools.retrieval import (
    search_documents, get_wiki_page, search_chunks, check_conflicts,
)
from app.agents.chat.tools.hitl import resolve_conflict
from app.agents.chat.prompts import MAIN_AGENT_SYSTEM_PROMPT

_checkpointer = MemorySaver()

_a2ui_subagent = {
    "name": "ui_renderer",
    "description": (
        "Generates rich declarative A2UI interface cards from structured data. "
        "Delegate when a visual card would communicate better than plain text — "
        "e.g. showing a wiki summary, comparing documents, listing sources."
    ),
    "system_prompt": "...",   # see backend-a2ui.md
    "tools": [],
    "skills": ["/skills/a2ui/"],
}

def create_chat_agent():
    return create_deep_agent(
        model=get_llm(),
        tools=[
            search_documents,
            get_wiki_page,
            search_chunks,
            check_conflicts,
            resolve_conflict,
        ],
        system_prompt=MAIN_AGENT_SYSTEM_PROMPT,
        subagents=[_a2ui_subagent],
        checkpointer=_checkpointer,
        name="chat_agent",
    )

chat_agent = create_chat_agent()
```

---

## System prompt: `backend/app/agents/chat/prompts.py`

Key sections:

```
You are a personal knowledge assistant for Chat Wiki. 
You answer questions grounded in the user's uploaded documents.

## Recommended retrieval flow
1. search_documents(query) — find candidate docs by topic match
2. get_wiki_page(document_id) — read synthesized knowledge for top candidates
3. check_conflicts(document_id) — check for conflicts on flagged docs BEFORE using them
4. search_chunks(document_id, query) — get raw source evidence when needed

## Hard rules (always follow)
1. Never answer from a conflict-flagged document without first calling check_conflicts and 
   surfacing the conflict to the user via resolve_conflict. Do not silently pick one source.
2. Call resolve_conflict at most once per run. If multiple conflicts exist, surface the most 
   relevant one and note others exist.
3. Always cite the source document title(s) in your answer.

## When to use ui_renderer
Delegate to ui_renderer when a structured visual card communicates better than text:
- Showing a full wiki summary → WikiCard
- Comparing conflicting documents → DocCompare  
- Listing matched source snippets → SourceBlock
- Showing topic overview → TopicMap
- Listing all documents → DocStatusBoard
- Answering with multiple sources → KnowledgePanel

For short factual answers, plain text is fine. Delegate when richness adds value.
```

---

## FastAPI endpoint: `backend/app/api/chat.py`

```python
from fastapi import FastAPI
from ag_ui_langgraph import add_langgraph_fastapi_endpoint
from app.agents.chat.agent import chat_agent
from app.utils.auth import get_user_id

def register_chat_endpoint(app: FastAPI):
    add_langgraph_fastapi_endpoint(
        app,
        chat_agent,
        "/agent/chat",
        # thread_id enforced server-side — see middleware below
    )
```

### Thread ID enforcement

`add_langgraph_fastapi_endpoint` passes `RunAgentInput.thread_id` to LangGraph config. We need to override it with `user_id` from JWT.

Options:
- **Middleware**: intercept request, decode JWT, rewrite `thread_id` in body before it hits the endpoint
- **Custom wrapper**: wrap the endpoint handler, extract user_id, pass as `configurable.thread_id`

Recommended approach: custom wrapper that extracts `user_id` from `Authorization` header and overrides `thread_id` before dispatching to LangGraph.

Pattern:
```python
@app.post("/agent/chat")
async def chat_endpoint(input_data: RunAgentInput, request: Request):
    user_id = get_user_id(request)              # decode JWT
    # Override thread_id — frontend-supplied value ignored
    input_data.thread_id = input_data.thread_id  # validate starts with user_id prefix
    # ... dispatch to ag_ui_langgraph handler
```

---

## `backend/main.py` changes

Register the chat router:

```python
from app.api.chat import register_chat_endpoint

register_chat_endpoint(app)
```

---

## Dependencies to install

```bash
uv add ag-ui-langgraph
```

Check if `ag_ui_langgraph` package name is `ag-ui-langgraph` on PyPI — verify before installing.

---

## Notes

- `MemorySaver` is in-process — state lost on server restart. Acceptable for MVP.
- `chat_agent` is a module-level singleton — shared across requests, thread-safe via LangGraph checkpointer keyed by `thread_id`.
- New Chat on frontend sends a new `thread_id = f"{user_id}-{timestamp}"` — creates fresh MemorySaver state automatically (no explicit deletion needed).
