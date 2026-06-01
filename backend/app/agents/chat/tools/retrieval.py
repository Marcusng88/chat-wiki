from langchain_core.tools import tool
from langchain_core.runnables import RunnableConfig
from psycopg.rows import dict_row

from app.db.db import get_conn
from app.db.conflicts import fetch_document_conflicts
from app.utils.model_provider import get_embeddings

_HAS_CONFLICT_SUBQUERY = """
    EXISTS (
        SELECT 1 FROM conflict_documents cd
        JOIN conflicts c ON c.id = cd.conflict_id
        WHERE cd.document_id = d.id
          AND c.status NOT IN ('resolved', 'dismissed')
    ) AS has_conflict
"""


@tool(parse_docstring=True)
async def list_docs(
    offset: int = 0,
    limit: int = 10,
    sort_by: str = "created_at",
    config: RunnableConfig = None,
) -> dict:
    """List available documents with summaries for browsing.

    Use when the user asks what documents are available, or when you need to
    enumerate material before deciding what to retrieve. Paginate with offset.

    Args:
        offset: Number of documents to skip (default 0).
        limit: Number of documents to return, max 20 (default 10).
        sort_by: Sort order — 'created_at' (newest first) or 'title' (A-Z).

    Returns:
        Dict with 'docs' list and 'total' count.
    """
    user_id = config["configurable"]["user_id"]
    limit = min(limit, 20)
    if sort_by not in ("created_at", "title"):
        sort_by = "created_at"

    order = "d.created_at DESC" if sort_by == "created_at" else "d.title ASC"

    async with get_conn() as conn:
        async with conn.cursor(row_factory=dict_row) as cur:
            await cur.execute(
                f"""
                SELECT
                    d.id::text,
                    d.title,
                    d.summary,
                    COALESCE(d.topics, '{{}}') AS topics,
                    {_HAS_CONFLICT_SUBQUERY}
                FROM documents d
                WHERE d.user_id = %s AND d.status = 'ready'
                ORDER BY {order}
                LIMIT %s OFFSET %s
                """,
                (user_id, limit, offset),
            )
            docs = await cur.fetchall()

            await cur.execute(
                "SELECT COUNT(*) AS total FROM documents WHERE user_id = %s AND status = 'ready'",
                (user_id,),
            )
            row = await cur.fetchone()

    return {"docs": [dict(d) for d in docs], "total": row["total"]}


@tool(parse_docstring=True)
async def search_documents(query: str, config: RunnableConfig = None) -> list[dict]:
    """Find documents whose topics match the query using full-text search.

    Use when the user asks about a specific subject and you want to find relevant
    documents without listing everything. Returns doc metadata including whether
    each doc has an active conflict.

    Args:
        query: Natural language search query to match against document topics.

    Returns:
        List of matching documents with id, title, topics, has_conflict, has_wiki.
    """
    user_id = config["configurable"]["user_id"]

    async with get_conn() as conn:
        async with conn.cursor(row_factory=dict_row) as cur:
            await cur.execute(
                f"""
                SELECT
                    d.id::text,
                    d.title,
                    COALESCE(d.topics, '{{}}') AS topics,
                    d.wiki_page IS NOT NULL AS has_wiki,
                    {_HAS_CONFLICT_SUBQUERY}
                FROM documents d
                WHERE d.user_id = %s
                  AND d.status = 'ready'
                  AND to_tsvector('english', array_to_string(COALESCE(d.topics, '{{}}'), ' '))
                      @@ plainto_tsquery('english', %s)
                """,
                (user_id, query),
            )
            return [dict(r) for r in await cur.fetchall()]


@tool(parse_docstring=True)
async def get_wiki_page(document_id: str, config: RunnableConfig = None) -> dict:
    """Fetch the agent-generated wiki page for a document.

    Use after search_documents or list_docs to retrieve the synthesized content
    for a specific document. Do NOT call on documents with has_conflict=True
    without first calling check_conflicts.

    Args:
        document_id: UUID of the document to fetch.

    Returns:
        Dict with title, wiki_page, topics, summary. Empty dict if not found.
    """
    user_id = config["configurable"]["user_id"]

    async with get_conn() as conn:
        async with conn.cursor(row_factory=dict_row) as cur:
            await cur.execute(
                """
                SELECT title, wiki_page, COALESCE(topics, '{}') AS topics, summary
                FROM documents
                WHERE id = %s AND user_id = %s AND status = 'ready'
                """,
                (document_id, user_id),
            )
            row = await cur.fetchone()

    return dict(row) if row else {}


@tool(parse_docstring=True)
async def search_chunks(
    document_id: str,
    query: str,
    limit: int = 5,
    config: RunnableConfig = None,
) -> list[dict]:
    """Retrieve the most relevant raw source chunks from a document using vector similarity.

    Use when you need exact source evidence rather than the synthesized wiki page.
    Returns chunks ordered by semantic relevance to the query.

    Args:
        document_id: UUID of the document to search within.
        query: Natural language query to find relevant chunks for.
        limit: Number of chunks to return (default 5, max 10).

    Returns:
        List of chunks with content, chunk_index.
    """
    user_id = config["configurable"]["user_id"]
    limit = min(limit, 10)

    async with get_conn() as conn:
        async with conn.cursor(row_factory=dict_row) as cur:
            await cur.execute(
                "SELECT id FROM documents WHERE id = %s AND user_id = %s AND status = 'ready'",
                (document_id, user_id),
            )
            if not await cur.fetchone():
                return []

    vector = await get_embeddings().aembed_query(query)

    async with get_conn() as conn:
        async with conn.cursor(row_factory=dict_row) as cur:
            await cur.execute(
                """
                SELECT content, chunk_index
                FROM chunks
                WHERE document_id = %s
                ORDER BY embedding <=> %s::vector
                LIMIT %s
                """,
                (document_id, str(vector), limit),
            )
            return [dict(r) for r in await cur.fetchall()]


@tool(parse_docstring=True)
async def vector_search(
    query: str,
    limit: int = 8,
    config: RunnableConfig = None,
) -> list[dict]:
    """Search across all ready documents using semantic vector similarity.

    Use when the user asks a question without specifying a document, or when
    you want to find the most relevant passages from the entire library at once.
    Returns ranked chunks from any document, with source doc title and score. 
    Use detailed and relevant and diversify queries to get better results.

    Args:
        query: Natural language query to find semantically relevant passages.
        limit: Number of chunks to return (default 8, max 20).

    Returns:
        List of chunks with content, relevance_score, doc_title, doc_id.
    """
    user_id = config["configurable"]["user_id"]
    limit = min(limit, 20)

    vector = await get_embeddings().aembed_query(query)

    async with get_conn() as conn:
        async with conn.cursor(row_factory=dict_row) as cur:
            await cur.execute(
                """
                SELECT
                    c.content,
                    d.id::text AS doc_id,
                    d.title AS doc_title,
                    1 - (c.embedding <=> %s::vector) AS relevance_score
                FROM chunks c
                JOIN documents d ON d.id = c.document_id
                WHERE d.user_id = %s AND d.status = 'ready'
                ORDER BY c.embedding <=> %s::vector
                LIMIT %s
                """,
                (str(vector), user_id, str(vector), limit),
            )
            return [dict(r) for r in await cur.fetchall()]


@tool(parse_docstring=True)
async def check_conflicts(document_id: str, config: RunnableConfig = None) -> list[dict]:
    """Check if a document has any active unresolved conflicts.

    Call this before answering from any document where has_conflict=True.
    Returns conflict details so you can decide whether to call resolve_conflict
    or proceed with caution.

    Args:
        document_id: UUID of the document to check for conflicts.

    Returns:
        List of active conflicts. Empty list means no active conflicts.
    """
    user_id = config["configurable"]["user_id"]
    return await fetch_document_conflicts(document_id, user_id)
