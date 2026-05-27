import uuid
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from psycopg.rows import dict_row

from app.db.db import get_conn
from app.db.storage import delete_file, get_presigned_upload_url
from app.schemas.documents import ConfirmRequest, DocumentResponse, PresignRequest, PresignResponse
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


@router.get("", response_model=list[DocumentResponse])
async def list_documents(user_id: str = Depends(get_user_id)):
    async with get_conn() as conn:
        async with conn.cursor(row_factory=dict_row) as cur:
            await cur.execute(
                """
                SELECT
                    d.id::text,
                    d.title,
                    d.file_type,
                    d.status,
                    d.wiki_page,
                    d.summary,
                    d.topics,
                    d.created_at,
                    EXISTS(
                        SELECT 1 FROM conflict_documents cd
                        JOIN conflicts c ON c.id = cd.conflict_id
                        WHERE cd.document_id = d.id
                          AND c.status NOT IN ('resolved', 'dismissed')
                    ) AS has_conflict
                FROM documents d
                WHERE d.user_id = %s
                ORDER BY d.created_at DESC
                """,
                (user_id,),
            )
            rows = await cur.fetchall()
    return rows


@router.get("/{document_id}/raw")
async def get_document_raw(document_id: str, user_id: str = Depends(get_user_id)):
    async with get_conn() as conn:
        async with conn.cursor(row_factory=dict_row) as cur:
            await cur.execute(
                "SELECT id FROM documents WHERE id = %s AND user_id = %s",
                (document_id, user_id),
            )
            if not await cur.fetchone():
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
            await cur.execute(
                "SELECT content FROM chunks WHERE document_id = %s ORDER BY chunk_index",
                (document_id,),
            )
            rows = await cur.fetchall()
    return {"raw": "\n\n".join(r["content"] for r in rows)}


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(document_id: str, user_id: str = Depends(get_user_id)):
    async with get_conn() as conn:
        async with conn.cursor(row_factory=dict_row) as cur:
            await cur.execute(
                "SELECT storage_path FROM documents WHERE id = %s AND user_id = %s",
                (document_id, user_id),
            )
            row = await cur.fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    try:
        delete_file(row["storage_path"])
    except Exception:
        pass
    async with get_conn() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "DELETE FROM documents WHERE id = %s AND user_id = %s",
                (document_id, user_id),
            )
