import uuid

from langchain_core.callbacks.manager import adispatch_custom_event
from langchain_core.runnables import RunnableConfig
from langchain_core.tools import tool

_CATALOG_ID = "https://a2ui.org/specification/v0_9/basic_catalog.json"

_KNOWN_COMPONENTS = frozenset({
    "Text", "Image", "Icon", "Video", "AudioPlayer",
    "Row", "Column", "List", "Card", "Tabs", "Modal",
    "Divider", "Button", "TextField", "CheckBox",
    "ChoicePicker", "Slider", "DateTimeInput",
})


def _is_value(v) -> bool:
    """str or {"path": str} binding."""
    if isinstance(v, str):
        return True
    if isinstance(v, dict) and isinstance(v.get("path"), str):
        return True
    return False


def _is_children(v) -> bool:
    """list of string IDs or template {"componentId": str, "path": str}."""
    if isinstance(v, list) and all(isinstance(x, str) for x in v):
        return True
    if isinstance(v, dict) and isinstance(v.get("componentId"), str) and isinstance(v.get("path"), str):
        return True
    return False


def _validate_components(components: list[dict]) -> str | None:
    """
    Returns a validation error string, or None if valid.
    Checks required props for all 18 basic catalog components and
    that referenced child IDs exist in the component list.
    """
    ids = {node["id"] for node in components}

    for node in components:
        nid = node.get("id")
        if not isinstance(nid, str) or not nid:
            return f"Validation error: node missing string 'id': {node}"

        comp = node.get("component")
        if comp not in _KNOWN_COMPONENTS:
            available = ", ".join(sorted(_KNOWN_COMPONENTS))
            return f"Validation error: unknown component '{comp}'. Available: {available}"

        def err(msg: str) -> str:
            return f"Validation error: {comp} id='{nid}' — {msg}"

        if comp == "Text":
            if not _is_value(node.get("text")):
                return err("required prop 'text' missing or invalid (must be a string or {\"path\": \"/key\"})")

        elif comp in ("Image", "Video", "AudioPlayer"):
            if not _is_value(node.get("url")):
                return err("required prop 'url' missing or invalid (must be a string or {\"path\": \"/key\"})")

        elif comp == "Icon":
            if not _is_value(node.get("name")):
                return err("required prop 'name' missing or invalid (must be a string or {\"path\": \"/key\"})")

        elif comp in ("Row", "Column", "List"):
            if not _is_children(node.get("children")):
                return err(
                    "required prop 'children' missing or invalid. "
                    "Use a list of IDs [\"id1\", \"id2\"] or template {\"componentId\": \"tmpl-id\", \"path\": \"/items\"}"
                )
            children = node.get("children")
            if isinstance(children, list):
                for cid in children:
                    if cid not in ids:
                        return err(f"children references unknown id '{cid}'")

        elif comp == "Card":
            child = node.get("child")
            if not isinstance(child, str) or not child:
                return err("required prop 'child' missing (must be a string ID of the single child node)")
            if child not in ids:
                return err(f"'child' references unknown id '{child}'")

        elif comp == "Button":
            child = node.get("child")
            if not isinstance(child, str) or not child:
                return err("required prop 'child' missing (must be a string ID — use a Text node for the label)")
            if child not in ids:
                return err(f"'child' references unknown id '{child}'")

        elif comp == "Tabs":
            tabs = node.get("tabs")
            if not isinstance(tabs, list) or not tabs:
                return err("required prop 'tabs' missing or empty (must be a list of {\"title\": str, \"child\": str})")
            for i, tab in enumerate(tabs):
                if not isinstance(tab, dict):
                    return err(f"tabs[{i}] must be a dict")
                if not isinstance(tab.get("title"), str) or not tab["title"]:
                    return err(f"tabs[{i}] missing 'title' (string). Do NOT use 'label'.")
                child = tab.get("child")
                if not isinstance(child, str) or not child:
                    return err(f"tabs[{i}] missing 'child' (string ID)")
                if child not in ids:
                    return err(f"tabs[{i}] 'child' references unknown id '{child}'")

        elif comp == "Modal":
            trigger = node.get("trigger")
            content = node.get("content")
            if not isinstance(trigger, str) or not trigger:
                return err("required prop 'trigger' missing (string ID of the component that opens the modal)")
            if not isinstance(content, str) or not content:
                return err("required prop 'content' missing (string ID of the component shown inside the modal)")
            if trigger not in ids:
                return err(f"'trigger' references unknown id '{trigger}'")
            if content not in ids:
                return err(f"'content' references unknown id '{content}'")

        elif comp == "TextField":
            if not _is_value(node.get("label")):
                return err("required prop 'label' missing or invalid (must be a string or {\"path\": \"/key\"})")

        elif comp == "CheckBox":
            if not _is_value(node.get("label")):
                return err("required prop 'label' missing or invalid (must be a string or {\"path\": \"/key\"})")
            value = node.get("value")
            if value is None:
                return err("required prop 'value' missing (boolean true/false or {\"path\": \"/key\"}). Do NOT use 'checked'.")
            if not isinstance(value, bool) and not _is_value(value):
                return err("'value' must be a boolean or {\"path\": \"/key\"}")

        elif comp == "ChoicePicker":
            options = node.get("options")
            if not isinstance(options, list) or not options:
                return err(
                    "required prop 'options' missing or empty "
                    "(must be a list of {\"label\": str, \"value\": str})"
                )
            value = node.get("value")
            if value is None:
                return err("required prop 'value' missing (list of selected values or {\"path\": \"/key\"})")

        elif comp == "Slider":
            value = node.get("value")
            if value is None:
                return err("required prop 'value' missing (number or {\"path\": \"/key\"})")
            if not isinstance(node.get("max"), (int, float)):
                return err("required prop 'max' missing or invalid (must be a number)")

        elif comp == "DateTimeInput":
            if not _is_value(node.get("value")):
                return err(
                    "required prop 'value' missing or invalid "
                    "(must be an ISO 8601 string, empty string \"\", or {\"path\": \"/key\"})"
                )

        # Divider: no required props beyond id + component

    if "root" not in ids:
        return "Validation error: components must include a node with id='root'"

    return None


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
    error = _validate_components(components)
    if error:
        return error

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
