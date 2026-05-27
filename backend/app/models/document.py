from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class DocumentRecord(BaseModel):
    id: str
    user_id: str
    title: str
    file_type: str
    storage_path: str
    status: str
    wiki_page: Optional[str] = None
    summary: Optional[str] = None
    topics: Optional[list[str]] = None
    created_at: datetime
    updated_at: datetime
