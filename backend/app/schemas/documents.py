from pydantic import BaseModel


class PresignRequest(BaseModel):
    filename: str
    file_type: str
    title: str


class PresignResponse(BaseModel):
    document_id: str
    presigned_url: str


class ConfirmRequest(BaseModel):
    document_id: str
