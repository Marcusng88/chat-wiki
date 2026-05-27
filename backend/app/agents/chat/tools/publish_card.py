import uuid

from langchain_core.callbacks.manager import adispatch_custom_event
from langchain_core.runnables import RunnableConfig
from langchain_core.tools import tool
from pydantic import ValidationError

from app.agents.chat.tools.schemas import CARD_SCHEMAS

_CATALOG_ID = "chat-wiki-catalog"


@tool(parse_docstring=True)
async def publish_card(
    component: str,
    data: dict,
    config: RunnableConfig = None,
) -> str:
    """Publish a UI card to the frontend chat panel.

    Validates the data against the component schema, emits the A2UI v0.9
    messages as a custom event, then returns a plain-text summary of the
    card contents for the main agent to reference.

    Args:
        component: Component name — one of WikiCard, SourceBlock, DocCompare,
            TopicMap, KnowledgePanel, DocStatusBoard.
        data: Component data dict matching the component's schema.

    Returns:
        Plain-text summary of the rendered card contents.
    """
    schema = CARD_SCHEMAS.get(component)
    if schema is None:
        available = ", ".join(CARD_SCHEMAS)
        return f"Unknown component '{component}'. Available: {available}"

    try:
        validated = schema.model_validate(data)
    except ValidationError as e:
        return f"Validation error for {component}: {e}"

    surface_id = f"s-{uuid.uuid4().hex[:8]}"
    payload = validated.model_dump()

    messages = [
        {"version": "v0.9", "createSurface": {"surfaceId": surface_id, "catalogId": _CATALOG_ID}},
        {
            "version": "v0.9",
            "updateComponents": {
                "surfaceId": surface_id,
                "components": [{"id": "root", "component": component}],
            },
        },
        {
            "version": "v0.9",
            "updateDataModel": {"surfaceId": surface_id, "path": "/", "value": payload},
        },
    ]

    for msg in messages:
        await adispatch_custom_event("a2ui_message", msg, config=config)

    return f"{component} rendered (surface {surface_id}). Data: {payload}"
