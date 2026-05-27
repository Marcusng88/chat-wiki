import uuid
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from psycopg.rows import dict_row

from app.db.db import get_conn
from app.db.storage import get_presigned_upload_url
from app.schemas.documents import ConfirmRequest, PresignRequest, PresignResponse
from app.services.ingestion import run_ingestion
from app.utils.auth import get_user_id

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("/presign", response_model=PresignResponse)
async def presign(req: PresignRequest, user_id: str = Depends(get_user_id)):
    file_type = req.file_type.lower().lstrip(".")
    storage_path = f"users/{user_id}/documents/{uuid.uuid4()}_{req.filename}"

    async with get_conn() as conn:
        async with conn.cursor(row_factory=dict_row) as cur:
            await cur.execute(
                """
                INSERT INTO documents (user_id, title, file_type, storage_path, status)
                VALUES (%s, %s, %s, %s, 'uploaded')
                RETURNING id
                """,
                (user_id, req.title, file_type, storage_path),
            )
            row = await cur.fetchone()

    presigned_url = get_presigned_upload_url(storage_path)
    return PresignResponse(document_id=str(row["id"]), presigned_url=presigned_url)


@router.post("/confirm", status_code=status.HTTP_202_ACCEPTED)
async def confirm(
    req: ConfirmRequest,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_user_id),
):
    async with get_conn() as conn:
        async with conn.cursor(row_factory=dict_row) as cur:
            await cur.execute(
                "SELECT id, file_type, status FROM documents WHERE id = %s AND user_id = %s",
                (req.document_id, user_id),
            )
            row = await cur.fetchone()

    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    if row["status"] != "uploaded":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Document already in state: {row['status']}",
        )

    background_tasks.add_task(run_ingestion, str(row["id"]), row["file_type"])
    return {"ok": True}
