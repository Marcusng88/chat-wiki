# Phase 1: Backend Changes

---

## 1. Delete `app/agents/chat/tools/publish_card.py`

Remove the file entirely. Replaced by `render_ui.py`.

## 2. Delete `app/agents/chat/tools/schemas.py`

Remove the file entirely. The 6 Pydantic models are no longer needed.

---

## 3. Create `app/agents/chat/tools/render_ui.py`

```python
import uuid

from langchain_core.callbacks.manager import adispatch_custom_event
from langchain_core.runnables import RunnableConfig
from langchain_core.tools import tool

_CATALOG_ID = "https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json"

_KNOWN_COMPONENTS = frozenset({
    "Text", "Image", "Icon", "Video", "AudioPlayer",
    "Row", "Column", "List", "Card", "Tabs", "Modal",
    "Divider", "Button", "TextField", "CheckBox",
    "ChoicePicker", "Slider", "DateTimeInput",
})


@tool(parse_docstring=True)
async def render_ui(
    components: list[dict],
    data_model: dict,
    config: RunnableConfig = None,
) -> str:
    """Render a dynamic UI surface in the frontend chat panel.

    Validates the component tree, emits A2UI v0.9 messages as custom events,
    and returns a plain confirmation string.

    Args:
        components: Flat adjacency list of component nodes. Each node must have
            'id' (str) and 'component' (str, one of the 18 basic catalog names).
            Use 'child' (str) for a single child or 'children' (list[str]) for multiple.
            Bind data via {"path": "/field"} on any string/number property.
            The root node must have id="root".
        data_model: Dict of values referenced by path bindings in the component tree.
            Supports nested keys; reference with JSON Pointer syntax e.g. "/author/name".

    Returns:
        "rendered (surface {surface_id})" on success, or a validation error string.
    """
    # Validate each node
    for node in components:
        if not isinstance(node.get("id"), str) or not node["id"]:
            return f"Validation error: component node missing string 'id': {node}"
        component_name = node.get("component")
        if component_name not in _KNOWN_COMPONENTS:
            available = ", ".join(sorted(_KNOWN_COMPONENTS))
            return (
                f"Validation error: unknown component '{component_name}'. "
                f"Available: {available}"
            )

    # Require root node
    ids = {node["id"] for node in components}
    if "root" not in ids:
        return "Validation error: components must include a node with id='root'"

    surface_id = f"s-{uuid.uuid4().hex[:8]}"

    messages = [
        {
            "version": "v0.9",
            "createSurface": {
                "surfaceId": surface_id,
                "catalogId": _CATALOG_ID,
            },
        },
        {
            "version": "v0.9",
            "updateComponents": {
                "surfaceId": surface_id,
                "components": components,
            },
        },
        {
            "version": "v0.9",
            "updateDataModel": {
                "surfaceId": surface_id,
                "path": "/",
                "value": data_model,
            },
        },
    ]

    for msg in messages:
        await adispatch_custom_event("a2ui_message", msg, config=config)

    return f"rendered (surface {surface_id})"
```

---

## 4. Update `app/agents/chat/subagents/a2ui.py`

Full file replacement:

```python
from deepagents.middleware.subagents import SubAgent

from app.agents.chat.tools.render_ui import render_ui

_SKILLS_DIR = "skills/a2ui"

A2UI_SUBAGENT: SubAgent = {
    "name": "ui_renderer",
    "description": (
        "Generates rich visual UI surfaces inline in the chat panel by composing "
        "primitives from the A2UI basic catalog (Text, Row, Column, Card, Icon, etc.). "
        "Delegate with the data to display and the visual intent. "
        "Use when a visual layout communicates better than plain text, "
        "or when the user asks for a visual summary, comparison, or overview."
    ),
    "system_prompt": (
        "You are a UI renderer for the chat-wiki assistant. "
        "Your only job is to call render_ui(components, data_model) once "
        "to produce a UI surface, then return the single word: rendered\n"
        "\n"
        "Read your skill files before composing:\n"
        "- SKILL.md: composition rules and quick examples\n"
        "- references/protocol.md: adjacency list format, path binding, child/children rules\n"
        "- references/catalog_guide.md: full prop reference for each component\n"
        "- references/examples.md: complete chat-wiki domain examples to copy from\n"
        "\n"
        "## Composition rules\n"
        "\n"
        "1. Build a flat adjacency list. Every node needs 'id' and 'component'.\n"
        "   Use 'child' (single string id) or 'children' (list of string ids) for nesting.\n"
        "   The root node must have id='root'.\n"
        "2. Put display values in data_model. Reference them with {\"path\": \"/field\"}.\n"
        "   For literal strings, write the string directly without a path object.\n"
        "3. Wrap everything in a Card at root. Use Column/Row for layout.\n"
        "   Text variant: h1/h2/h3/h4/h5 for headings, caption for labels, body for content.\n"
        "4. Omit optional props not needed — do not invent placeholder values.\n"
        "5. Do not fabricate data not present in the delegation description.\n"
        "6. Call render_ui exactly once.\n"
        "\n"
        "## On validation error\n"
        "\n"
        "If render_ui returns a validation error:\n"
        "1. Read the field or component name in the error message.\n"
        "2. Fix only that issue against the schema in references/catalog_guide.md.\n"
        "3. Call render_ui again with the corrected arguments.\n"
        "4. Retry up to 3 times total. If still failing, return the error string.\n"
        "\n"
        "## Output formatting rules\n"
        "\n"
        "Any markdown content placed in data_model fields (e.g. content, answer, excerpt) "
        "is rendered via react-markdown + remark-gfm + KaTeX on the frontend.\n"
        "\n"
        "Math — use only:\n"
        "- Inline: `$...$`\n"
        "- Display block: `$$...$$`\n"
        "Never use `\\[...\\]`, `\\(...\\)`, or bare LaTeX — renders as raw text.\n"
        "\n"
        "Code blocks — always include a language tag:\n"
        "```python\n"
        "# code here\n"
        "```\n"
        "\n"
        "No raw HTML. No footnotes (`[^1]` not supported).\n"
        "\n"
        "## Do not\n"
        "\n"
        "- Write explanatory text before or after calling render_ui\n"
        "- Call render_ui more than once\n"
        "- Ask the user questions\n"
        "- Return anything other than 'rendered' after a successful call\n"
    ),
    "tools": [render_ui],
    "skills": [_SKILLS_DIR],
}
```

---

## 5. Update `app/agents/chat/AGENTS.md` — Visual Cards section

Replace the **Visual Cards (A2UI)** section with the following.
Everything else in AGENTS.md stays unchanged.

```markdown
## Visual Cards (A2UI)

Delegate to `ui_renderer` via `task(subagent_type='ui_renderer', description='...')`.

### When to use a card

| Trigger | Visual intent |
|---|---|
| User says "show", "visualize", "summarize visually", "give me a card" | rich summary card |
| User asks "compare X and Y" | side-by-side column comparison |
| User asks "what docs do I have" | status list or topic cloud |
| Topic spans ≥2 sources worth visual comparison | multi-source panel with citations |
| User wants a specific quote surfaced visually | blockquote source card |
| User says "explain", "tell me", "what is X" | text only — no card |

Interleave freely — text, card, text, card — as the response warrants.

### Delegation rules

1. **Fetch and organize first.** You synthesize the content. `ui_renderer` only renders —
   it has no DB access and generates nothing.
2. **Pass full final content.** Titles, full body text, real IDs, actual lists.
   Never pass vague instructions like "show the transformer doc".
3. **Describe visual intent.** Tell `ui_renderer` what kind of layout fits —
   e.g. "a card with a title, full markdown body, and topic chips at the bottom".
   It will pick the right primitives.
4. **Never echo raw tool output** as text. If you fetched a wiki page, either paraphrase
   it in prose or delegate to `ui_renderer` — never paste raw results verbatim.
5. **One delegation per response** unless interleaving multiple surface types.

### Delegation format

Use labeled fields for data, then a plain-English intent line at the end:

```
task(
  subagent_type='ui_renderer',
  description="""
title: "Attention Is All You Need"
date: "2017-06-12"
content: "<full synthesized text — do not truncate>"
topics: ["transformers", "attention", "self-attention"]
doc_id: "abc123"

intent: rich document summary card — title header, full markdown content body,
topic chips at the bottom, date in caption style
"""
)
```

Use labeled fields, not prose sentences for data. Prose descriptions work for intent.
After `ui_renderer` returns, reference the content naturally in your reply —
never say "I've generated a visual" or "above is a card".
```

---

## 6. `app/agents/chat/tools/__init__.py` — No change needed

`render_ui` is imported directly by `a2ui.py` — it is not part of the main agent's toolset
and does not need to be exported from `__init__.py`.
