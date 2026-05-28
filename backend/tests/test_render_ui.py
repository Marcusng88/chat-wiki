import pytest
from unittest.mock import AsyncMock, patch

from app.agents.chat.tools.render_ui import render_ui


@pytest.mark.asyncio
async def test_node_missing_id():
    result = await render_ui.ainvoke({
        "components": [{"component": "Text", "text": "hi"}],
        "data_model": {},
    })
    assert "missing string 'id'" in result


@pytest.mark.asyncio
async def test_unknown_component():
    result = await render_ui.ainvoke({
        "components": [{"id": "root", "component": "FakeWidget"}],
        "data_model": {},
    })
    assert "unknown component 'FakeWidget'" in result


@pytest.mark.asyncio
async def test_missing_root_node():
    result = await render_ui.ainvoke({
        "components": [{"id": "body", "component": "Text", "text": "hi"}],
        "data_model": {},
    })
    assert "id='root'" in result


@pytest.mark.asyncio
async def test_happy_path_dispatches_three_events():
    components = [
        {"id": "root", "component": "Card", "child": "body"},
        {"id": "body", "component": "Text", "text": "Hello"},
    ]
    data_model = {"title": "Test"}

    with patch(
        "app.agents.chat.tools.render_ui.adispatch_custom_event",
        new_callable=AsyncMock,
    ) as mock_dispatch:
        result = await render_ui.ainvoke({
            "components": components,
            "data_model": data_model,
        })

    assert result.startswith("rendered (surface s-")
    assert mock_dispatch.call_count == 3

    calls = mock_dispatch.call_args_list
    assert calls[0].args[0] == "a2ui_message"
    assert "createSurface" in calls[0].args[1]
    assert calls[1].args[0] == "a2ui_message"
    assert "updateComponents" in calls[1].args[1]
    assert calls[2].args[0] == "a2ui_message"
    assert "updateDataModel" in calls[2].args[1]

    surface_id = calls[0].args[1]["createSurface"]["surfaceId"]
    assert calls[1].args[1]["updateComponents"]["surfaceId"] == surface_id
    assert calls[2].args[1]["updateDataModel"]["surfaceId"] == surface_id
    assert calls[2].args[1]["updateDataModel"]["value"] == data_model
