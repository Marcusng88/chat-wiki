from langchain_core.tools import tool
from psycopg.rows import dict_row

from app.db.db import get_conn

VALID_STATUSES = {
    "processing",
    "failed_extract",
    "failed_embed",
    "failed_wiki",
    "failed_index",
    "conflict_scan",
    "ready",
}


@tool(parse_docstring=True)
async def update_status(document_id: str, status: str) -> str:
    """Update the processing status of a document.

    Use this at the start of ingestion (processing), after each failed stage
    (failed_*), and at the end of a successful pipeline (conflict_scan then ready).
    Do NOT call with "ready" unless extract, chunk_and_embed, save_wiki, and
    save_index have all completed without error.

    Args:
        document_id: UUID of the document to update. Use exactly as provided —
            do not modify or shorten.
        status: New status value. Must be one of: processing, failed_extract,
            failed_embed, failed_wiki, failed_index, conflict_scan, ready.
            Use failed_<stage> only when that specific stage raised an error.

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
