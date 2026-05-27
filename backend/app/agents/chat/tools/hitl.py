from langchain_core.tools import tool
from langchain_core.runnables import RunnableConfig
from langgraph.types import interrupt

from app.db.conflicts import fetch_conflict_with_docs, resolve_conflict_db


@tool(parse_docstring=True)
async def resolve_conflict(
    conflict_id: str,
    recommendation: str,
    config: RunnableConfig = None,
) -> str:
    """Surface a conflict to the user for resolution via an interactive card.

    Pauses agent execution until the user approves, rejects, or modifies
    the conflict. Call check_conflicts first to gather conflict details.
    Call this at most once per run — only surface one conflict at a time.

    Args:
        conflict_id: UUID of the conflict to resolve.
        recommendation: Your suggested action and reasoning for the user.

    Returns:
        Resolution outcome string describing the user's decision.
    """
    user_id = config["configurable"]["user_id"]

    conflict = await fetch_conflict_with_docs(conflict_id, user_id)
    if not conflict:
        return f"Conflict {conflict_id} not found or already resolved."

    decision = interrupt({
        "conflict_id": conflict_id,
        "conflict_type": conflict["conflict_type"],
        "recommendation": recommendation,
        "documents": conflict["documents"],
    })

    action = decision.get("action", "reject")
    preferred_doc_id = decision.get("preferred_document_id")
    notes = decision.get("notes")

    await resolve_conflict_db(conflict_id, action, preferred_doc_id, notes, user_id)

    outcome = f"Conflict {conflict_id} {action}d."
    if preferred_doc_id:
        outcome += f" Preferred document: {preferred_doc_id}."
    return outcome
