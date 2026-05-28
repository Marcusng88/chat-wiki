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
            Bind data using a path object with key 'path' and a JSON Pointer value.
            The root node must have id='root'.
        data_model: Dict of values referenced by path bindings in the component tree.
            Supports nested keys; reference with JSON Pointer syntax e.g. '/author/name'.

    Returns:
        "rendered (surface {surface_id})" on success, or a validation error string.
    """
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
