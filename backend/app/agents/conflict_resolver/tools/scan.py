from langchain_core.tools import tool
from langchain_core.runnables import RunnableConfig

from app.db.conflicts import (
    fetch_conflict_candidates,
    fetch_doc_chunks,
    fetch_doc_wiki,
    fetch_unscanned_docs,
)
from app.utils.model_provider import get_embeddings


@tool
async def list_unscanned_docs(config: RunnableConfig = None) -> list[dict]:
    """List ready documents that have never been scanned for conflicts.

    Call this first. These are the documents you must work through one by one; a
    document stays unscanned until you call mark_scanned on it. Returns a list of
    docs with id, title, summary, created_at. Empty list means nothing to scan —
    you are done.
    """
    user_id = config["configurable"]["user_id"]
    return await fetch_unscanned_docs(user_id)


@tool(parse_docstring=True)
async def find_conflict_candidates(document_id: str, config: RunnableConfig = None) -> list[dict]:
    """Find the documents most semantically similar to a given document.

    Use this on each unscanned document to narrow the search. Only these
    candidates can possibly conflict with it — ignore everything else. This is
    retrieval only; YOU decide whether a real conflict exists by reading content.

    Args:
        document_id: UUID of the document to find similar documents for.

    Returns:
        List of candidate docs with id, title, summary, created_at, similarity
        (0-1, higher = more similar). Empty list means no overlap — the doc is
        clean; mark_scanned it and move on.
    """
    user_id = config["configurable"]["user_id"]
    return await fetch_conflict_candidates(document_id, user_id)


@tool(parse_docstring=True)
async def get_doc_wiki(document_id: str, config: RunnableConfig = None) -> dict:
    """Fetch a document's synthesized wiki page + summary for judgment.

    Read the source doc and each promising candidate, then compare. The wiki is a
    summary, so it catches whole-topic disagreements but can MISS a single
    contradicting fact/row. If two wikis look near-identical yet similarity is
    high, drill with get_doc_evidence before deciding "no conflict".

    Args:
        document_id: UUID of the document to read.

    Returns:
        Dict with title, wiki_page, summary, created_at. Empty dict if not found.
    """
    user_id = config["configurable"]["user_id"]
    return await fetch_doc_wiki(document_id, user_id) or {}


@tool(parse_docstring=True)
async def get_doc_evidence(
    document_id: str,
    query: str,
    limit: int = 5,
    config: RunnableConfig = None,
) -> list[dict]:
    """Drill into a document's RAW chunks about a specific fact via vector search.

    Use when wikis are inconclusive but the docs are highly similar — to compare
    exact figures, dates, names, or rows that a wiki summary may have dropped.
    Run on both docs with the same query, then compare the returned values.

    Args:
        document_id: UUID of the document to drill into.
        query: The specific fact to look for (e.g. "subscription price", "launch date").
        limit: Number of chunks to return (default 5, max 10).

    Returns:
        List of raw chunks with content, chunk_index, page_ref. Empty if not found.
    """
    user_id = config["configurable"]["user_id"]
    limit = min(limit, 10)
    vector = await get_embeddings().aembed_query(query)
    return await fetch_doc_chunks(document_id, user_id, str(vector), limit)
