from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse

from ag_ui.core import RunAgentInput
from ag_ui.encoder import EventEncoder

from app.agents.chat.agent import build_chat_agent
from app.utils.auth import get_user_id

router = APIRouter(prefix="/agent", tags=["agent"])

_agent = build_chat_agent()


@router.post("/chat")
async def chat_endpoint(
    input_data: RunAgentInput,
    request: Request,
    user_id: str = Depends(get_user_id),
):
    thread_id = input_data.thread_id or f"{user_id}_0"
    if not thread_id.startswith(user_id):
        thread_id = f"{user_id}_0"

    input_data = input_data.model_copy(update={"thread_id": thread_id})

    request_agent = _agent.clone()
    request_agent.config = {"configurable": {"user_id": user_id}}

    encoder = EventEncoder(accept=request.headers.get("accept"))

    async def event_generator():
        async for event in request_agent.run(input_data):
            yield encoder.encode(event)

    return StreamingResponse(event_generator(), media_type=encoder.get_content_type())
