from fastapi import APIRouter, BackgroundTasks, Depends, status

from app.services.resolution import run_resolver
from app.utils.auth import get_user_id

router = APIRouter(prefix="/agent", tags=["agent"])


@router.post("/resolve", status_code=status.HTTP_202_ACCEPTED)
async def resolve(
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_user_id),
):
    background_tasks.add_task(run_resolver, user_id)
    return {"ok": True}
