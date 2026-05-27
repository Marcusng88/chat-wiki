from langchain_core.tools import tool
from psycopg.rows import dict_row

from app.db.db import get_conn


@tool(parse_docstring=True)
async def save_index(document_id: str, summary: str, topics: list[str]) -> str:
    """Persist the index metadata for a document after the wiki page is saved.

    Use this AFTER save_wiki and BEFORE the final update_status calls. Call
    exactly once. Updates documents.summary and documents.topics — these are
    used by the Main Agent to narrow retrieval scope without loading full wiki pages.

    summary: one concise paragraph (3-5 sentences) covering the document's
    purpose, key subject matter, and audience. Topics: 5-15 keywords or short
    phrases that a user might search to find this document; include synonyms,
    abbreviations, and domain terms. Do not repeat the document title verbatim.

    Args:
        document_id: UUID of the document. Use exactly as provided.
        summary: Concise paragraph summary of the document for index scanning.
        topics: List of 5-15 keyword strings for retrieval narrowing.

    Returns:
        Confirmation string.

    Raises:
        RuntimeError: If document_id not found or update fails.
    """
    async with get_conn() as conn:
        async with conn.cursor(row_factory=dict_row) as cur:
            await cur.execute(
                """
                UPDATE documents
                SET summary = %s, topics = %s, updated_at = now()
                WHERE id = %s
                RETURNING id
                """,
                (summary, topics, document_id),
            )
            row = await cur.fetchone()

    if not row:
        raise RuntimeError(f"Document {document_id} not found")

    return f"Index saved for document {document_id} ({len(topics)} topics)"
