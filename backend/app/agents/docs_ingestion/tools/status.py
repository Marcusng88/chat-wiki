from langchain_core.tools import tool
from psycopg.rows import dict_row

from app.db.db import get_conn
from app.schemas.enums import DocumentStatus

VALID_STATUSES = {s.value for s in DocumentStatus} - {"uploading", "failed"}


@tool(parse_docstring=True)
async def update_status(document_id: str, status: str) -> str:
    """Update the processing status of a document.

    Use this at the start of each pipeline stage and on failure. Call in order:
    extracting → chunking → embedding → generating_wiki → indexing → conflict_scan → ready.
    Do NOT call with "ready" unless extract, chunk_and_embed, save_wiki, and
    save_index have all completed without error.

    Args:
        document_id: UUID of the document to update. Do not modify or shorten.
        status: New status value. Must be one of: uploaded, extracting, chunking,
            embedding, generating_wiki, indexing, conflict_scan, ready,
            failed_extraction, failed_embedding, failed_wiki, failed_indexing,
            unsupported. Use failed_<stage> only when that specific stage raised
            an error.

    Returns:
        Confirmation string with document_id and new status.

    Raises:
        ValueError: If status is not a recognised value.
        RuntimeError: If document_id does not exist in the database.
    """
    if status not in VALID_STATUSES:
        raise ValueError(f"Invalid status '{status}'. Must be one of: {VALID_STATUSES}")

    async with get_conn() as conn:
        async with conn.cursor(row_factory=dict_row) as cur:
            await cur.execute(
                "UPDATE documents SET status = %s, updated_at = now() WHERE id = %s RETURNING id",
                (status, document_id),
            )
            row = await cur.fetchone()

    if not row:
        raise RuntimeError(f"Document {document_id} not found")

    return f"Status updated to '{status}' for document {document_id}"
