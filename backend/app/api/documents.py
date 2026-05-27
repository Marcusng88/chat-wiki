import uuid
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status

from app.db.documents import (
    insert_document,
    fetch_document,
    fetch_document_storage_path,
    fetch_document_list,
    fetch_chunks,
    remove_document,
)
from app.db.storage import delete_file, get_presigned_upload_url
from app.schemas.documents import ConfirmRequest, DocumentResponse, PresignRequest, PresignResponse
from app.services.ingestion import run_ingestion
from app.utils.auth import get_user_id

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("/presign", response_model=PresignResponse)
async def presign(req: PresignRequest, user_id: str = Depends(get_user_id)):
    file_type = req.file_type.lower().lstrip(".")
    storage_path = f"users/{user_id}/documents/{uuid.uuid4()}_{req.filename}"
    document_id = await insert_document(user_id, req.title, file_type, storage_path)
    presigned_url = get_presigned_upload_url(storage_path)
    return PresignResponse(document_id=document_id, presigned_url=presigned_url)


@router.post("/confirm", status_code=status.HTTP_202_ACCEPTED)
async def confirm(
    req: ConfirmRequest,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_user_id),
):
    row = await fetch_document(req.document_id, user_id)
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
    return await fetch_document_list(user_id)


@router.get("/{document_id}/raw")
async def get_document_raw(document_id: str, user_id: str = Depends(get_user_id)):
    if not await fetch_document(document_id, user_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    rows = await fetch_chunks(document_id)
    return {"raw": "\n\n".join(r["content"] for r in rows)}


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(document_id: str, user_id: str = Depends(get_user_id)):
    storage_path = await fetch_document_storage_path(document_id, user_id)
    if storage_path is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    try:
        delete_file(storage_path)
    except Exception:
        pass
    await remove_document(document_id, user_id)
