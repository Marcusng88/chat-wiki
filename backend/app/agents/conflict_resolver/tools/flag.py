from langchain_core.tools import tool
from langchain_core.runnables import RunnableConfig

from app.db.conflicts import insert_conflict, set_doc_scanned

VALID_CONFLICT_TYPES = {"duplicate", "outdated", "contradictory"}


@tool(parse_docstring=True)
async def save_conflict(
    document_ids: list[str],
    conflict_type: str,
    detail: str,
    config: RunnableConfig = None,
) -> str:
    """Flag a conflict between two or more documents.

    Call this ONCE per distinct claim group. Group every document arguing about
    the same fact into a single call (N-way), not one call per pair. Skipped
    automatically if an identical active conflict already exists.

    NEVER set a preferred document here — the user decides that later at HITL.
    NEVER call this when the documents actually agree.

    Args:
        document_ids: UUIDs of the 2+ documents in conflict. Must be exactly the
            docs that disagree on this one claim.
        conflict_type: One of 'duplicate' (same info repeated), 'outdated' (newer
            doc supersedes older), 'contradictory' (irreconcilable facts).
        detail: Plain explanation of the disagreement plus your suggested winner
            and why (e.g. "Doc B (2026-03) lists price $70, Doc A (2025-09) lists
            $50 — Doc B likely correct, it is newer").

    Returns:
        Status string: created with conflict id, or skipped with reason.
    """
    user_id = config["configurable"]["user_id"]
    if conflict_type not in VALID_CONFLICT_TYPES:
        raise ValueError(
            f"Invalid conflict_type '{conflict_type}'. Must be one of: {VALID_CONFLICT_TYPES}"
        )
    result = await insert_conflict(user_id, document_ids, conflict_type, detail)
    if result["created"]:
        return f"Conflict flagged ({conflict_type}), id={result['conflict_id']}"
    return f"Skipped: {result['reason']} (conflict_id={result['conflict_id']})"


@tool(parse_docstring=True)
async def mark_scanned(document_id: str, config: RunnableConfig = None) -> str:
    """Mark a document as scanned so it is never re-scanned.

    Call this on EVERY document after you finish judging it — whether or not you
    found a conflict. Forgetting this makes the scan loop forever.

    Args:
        document_id: UUID of the document you finished scanning.

    Returns:
        Confirmation string.
    """
    user_id = config["configurable"]["user_id"]
    await set_doc_scanned(document_id, user_id)
    return f"Document {document_id} marked scanned"
