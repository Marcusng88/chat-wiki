from langchain_core.tools import tool
from psycopg.rows import dict_row

from app.db.db import get_conn


@tool(parse_docstring=True)
async def read_chunks_batch(document_id: str, offset: int, limit: int) -> list[dict]:
    """Read a paginated batch of text chunks for a document.

    Use this to retrieve chunk content for wiki generation. Call repeatedly
    with increasing offset until an empty list is returned — that signals all
    chunks have been read. Do NOT call save_wiki until the empty list is
    returned (i.e. all chunks have been read and synthesised).

    Recommended usage pattern:
        offset = 0, limit = 20 → process batch
        offset = 20, limit = 20 → process batch
        ... repeat until result is empty list

    Args:
        document_id: UUID of the document. Must match the document_id used in
            chunk_and_embed — do not use a different ID.
        offset: Number of chunks to skip. Start at 0, increment by limit each call.
        limit: Maximum chunks to return per batch. Use 20 unless the content is
            very dense; do not exceed 50.

    Returns:
        List of dicts with keys chunk_index (int) and content (str), ordered by
        chunk_index. Empty list means no more chunks remain.
    """
    async with get_conn() as conn:
        async with conn.cursor(row_factory=dict_row) as cur:
            await cur.execute(
                """
                SELECT chunk_index, content
                FROM chunks
                WHERE document_id = %s
                ORDER BY chunk_index
                LIMIT %s OFFSET %s
                """,
                (document_id, limit, offset),
            )
            rows = await cur.fetchall()

    return [{"chunk_index": r["chunk_index"], "content": r["content"]} for r in rows]


@tool(parse_docstring=True)
async def save_wiki(document_id: str, wiki_content: str) -> str:
    """Persist the generated wiki page for a document.

    Use this AFTER reading ALL chunks via read_chunks_batch (i.e. after the
    empty-list termination signal). Call exactly once. Do NOT call with a
    partial draft — only call when the full wiki page is complete.

    The wiki_content MUST contain all five sections in order:
    ## Summary, ## Key Concepts, ## Entities, ## Important Facts,
    ## Retrieval Hints. Missing sections will degrade retrieval quality.

    Args:
        document_id: UUID of the document. Use exactly as provided.
        wiki_content: Complete markdown wiki page with all five required sections.
            Content must be derived from the chunks — do not hallucinate facts.

    Returns:
        Confirmation string.

    Raises:
        RuntimeError: If document_id not found.
    """
    async with get_conn() as conn:
        async with conn.cursor(row_factory=dict_row) as cur:
            await cur.execute(
                "UPDATE documents SET wiki_page = %s, updated_at = now() WHERE id = %s RETURNING id",
                (wiki_content, document_id),
            )
            row = await cur.fetchone()

    if not row:
        raise RuntimeError(f"Document {document_id} not found")

    return f"Wiki saved for document {document_id}"
