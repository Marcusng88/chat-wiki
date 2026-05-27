from typing import Literal

from pydantic import BaseModel


class WikiCardData(BaseModel):
    title: str
    content: str
    topics: list[str]
    doc_id: str
    created_at: str


class SourceBlockData(BaseModel):
    doc_title: str
    excerpt: str
    doc_id: str
    page_ref: str | None = None
    relevance_score: float | None = None


class _DocCompareEntry(BaseModel):
    doc_id: str
    title: str
    excerpt: str
    role: Literal["current", "outdated", "conflicting"]


class DocCompareData(BaseModel):
    topic: str
    entries: list[_DocCompareEntry]


class _TopicEntry(BaseModel):
    label: str
    doc_count: int
    docs: list[str]


class TopicMapData(BaseModel):
    topics: list[_TopicEntry]
    highlighted_topic: str | None = None


class _KnowledgePanelSource(BaseModel):
    title: str
    snippet: str
    doc_id: str


class KnowledgePanelData(BaseModel):
    query: str
    answer_md: str
    sources: list[_KnowledgePanelSource]


class _DocStatusEntry(BaseModel):
    title: str
    status: str
    file_type: str
    topics: list[str]


class DocStatusBoardData(BaseModel):
    docs: list[_DocStatusEntry]


CARD_SCHEMAS: dict[str, type[BaseModel]] = {
    "WikiCard": WikiCardData,
    "SourceBlock": SourceBlockData,
    "DocCompare": DocCompareData,
    "TopicMap": TopicMapData,
    "KnowledgePanel": KnowledgePanelData,
    "DocStatusBoard": DocStatusBoardData,
}
