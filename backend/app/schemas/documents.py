from datetime import datetime

from pydantic import BaseModel

from app.schemas.enums import DocumentStatus


class PresignRequest(BaseModel):
    filename: str
    file_type: str
    title: str


class PresignResponse(BaseModel):
    document_id: str
    presigned_url: str


class ConfirmRequest(BaseModel):
    document_id: str


class DocumentResponse(BaseModel):
    id: str
    title: str
    file_type: str
    status: DocumentStatus
    has_conflict: bool
    created_at: datetime
    wiki_page: str | None = None
    summary: str | None = None
    topics: list[str] = []
