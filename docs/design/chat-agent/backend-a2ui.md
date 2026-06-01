# Phase 3 — Backend: A2UI Subagent + Skill File

## Files to create

- `backend/skills/a2ui/SKILL.md` — teaches ui_renderer the A2UI v0.9 protocol + our catalog
- `backend/app/agents/chat/a2ui_subagent.py` — subagent config with schema manager

---

## How it works

1. Main agent delegates to `ui_renderer` via `task()` tool: `"Render a WikiCard for: {data}"`
2. `ui_renderer` subagent has SKILL.md loaded into its context — knows A2UI v0.9 format + catalog
3. Subagent generates valid A2UI JSON in its response
4. Uses `get_stream_writer()` to emit JSON as custom event mid-stream:
   ```python
   writer({"type": "a2ui_message", "data": <a2ui_json>})
   ```
5. `ag_ui_langgraph` propagates custom events from subgraph → AG-UI `CustomEvent(name="a2ui_message")`
6. Frontend `useChat` feeds to `MessageProcessor`

---

## Skill file: `backend/skills/a2ui/SKILL.md`

Content structure:

```markdown
# A2UI UI Renderer Skill

You generate declarative A2UI v0.9 JSON interfaces. Output ONLY valid A2UI JSON messages.

## Protocol

Every surface requires 3 messages in sequence:

### 1. createSurface
\```json
{"version": "v0.9", "createSurface": {"surfaceId": "<unique-id>", "catalogId": "chat-wiki-catalog"}}
\```

### 2. updateComponents
\```json
{"version": "v0.9", "updateComponents": {"surfaceId": "<id>", "components": [...]}}
\```

### 3. updateDataModel
\```json
{"version": "v0.9", "updateDataModel": {"surfaceId": "<id>", "path": "/", "value": {...}}}
\```

## Catalog: chat-wiki-catalog

### WikiCard
Shows a document's synthesized wiki page.
Props: title (string), content (markdown string), topics (string[]), doc_id (string), created_at (string)

Example:
\```json
{"version": "v0.9", "updateComponents": {"surfaceId": "s1", "components": [
  {"id": "root", "component": "WikiCard", "children": []},
]}}
\```
\```json
{"version": "v0.9", "updateDataModel": {"surfaceId": "s1", "path": "/", "value": {
  "title": "Transformer Architecture",
  "content": "## Overview\nTransformers use self-attention...",
  "topics": ["transformers", "attention", "NLP"],
  "doc_id": "abc123",
  "created_at": "2026-05-27"
}}}
\```

### SourceBlock
Shows a raw source chunk with provenance.
Props: doc_title (string), page_ref (string), excerpt (string), doc_id (string), relevance_score (number, optional)

### DocCompare
Compares N documents on a specific topic.
Props: topic (string), entries (array of {doc_id, title, excerpt, role: "outdated"|"current"|"conflicting"})

### TopicMap
Visual topic cluster across the knowledge base.
Props: topics (array of {label, doc_count, docs: string[]}), highlighted_topic (string, optional)

### KnowledgePanel
Aggregated multi-source answer with source cards.
Props: query (string), answer_md (string), sources (array of {title, snippet, doc_id})

### DocStatusBoard
Overview of all documents with processing states.
Props: docs (array of {title, status, file_type, topics: string[]})

## Rules
- Always use surfaceId = short UUID (e.g. "s-" + first 8 chars)
- catalogId is always "chat-wiki-catalog"
- Emit createSurface → updateComponents → updateDataModel in order
- Use {path: "/field"} binding syntax for dynamic data in components
- Output the 3 messages as JSON, one per line
```

---

## Subagent config: `backend/app/agents/chat/a2ui_subagent.py`

```python
import os
from pathlib import Path

_SKILL_PATH = str(Path(__file__).parent.parent.parent.parent / "skills" / "a2ui")

A2UI_SUBAGENT = {
    "name": "ui_renderer",
    "description": (
        "Generates rich declarative A2UI v0.9 interface cards. "
        "Delegate with the structured data and component name. "
        "Use when visual layout communicates better than plain text."
    ),
    "system_prompt": (
        "You are a UI renderer. You generate A2UI v0.9 JSON for the chat-wiki catalog. "
        "Read your skill file for the protocol and all available components. "
        "Output only valid JSON messages — no prose, no explanation."
    ),
    "tools": [],
    "skills": [_SKILL_PATH],
}
```

---

## Dependencies to install

```bash
uv add a2ui-agent-sdk
```

`A2uiSchemaManager` from `a2ui-agent-sdk` can auto-generate the system prompt with schema injection. Alternative to manual SKILL.md if SDK supports our catalog format.

Check: can `a2ui-agent-sdk` generate system prompts compatible with deepagents skill loading, or is SKILL.md approach simpler? SKILL.md is recommended — more explicit, no SDK dependency on backend.

---

## Notes

- `ui_renderer` has no tools — it only generates JSON from data the main agent provides
- Main agent must pass all needed data in the delegation message: `"Render WikiCard: title=X, content=Y, topics=[...]"`
- Subagent does NOT fetch from DB — main agent fetches first, then delegates rendering
- `get_stream_writer()` emits custom events visible to `ag_ui_langgraph` via `subgraphs=True` stream mode
