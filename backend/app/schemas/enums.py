from enum import StrEnum


class DocumentStatus(StrEnum):
    UPLOADING = "uploading"
    UPLOADED = "uploaded"
    EXTRACTING = "extracting"
    CHUNKING = "chunking"
    EMBEDDING = "embedding"
    GENERATING_WIKI = "generating_wiki"
    INDEXING = "indexing"
    CONFLICT_SCAN = "conflict_scan"
    READY = "ready"
    FAILED_EXTRACTION = "failed_extraction"
    FAILED_EMBEDDING = "failed_embedding"
    FAILED_WIKI = "failed_wiki"
    FAILED_INDEXING = "failed_indexing"
    UNSUPPORTED = "unsupported"
    FAILED = "failed"
