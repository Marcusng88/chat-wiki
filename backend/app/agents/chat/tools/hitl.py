from langchain_core.tools import tool
from langchain_core.runnables import RunnableConfig
from langgraph.types import interrupt

from app.db.conflicts import fetch_conflict_with_docs, resolve_conflict_db


@tool(parse_docstring=True)
async def resolve_conflict(
    conflict_id: str,
    recommendation: str,
    stances: list[dict],
    recommended_document_id: str = None,
    config: RunnableConfig = None,
) -> str:
    """Surface a conflict to the user for resolution via an interactive card.

    Pauses agent execution until the user approves, rejects, or modifies the
    conflict. Call check_conflicts first to read the conflict's `detail`, and
    drill the relevant chunks (search_chunks) of each document so your guidance
    is grounded in the actual evidence. Call this at most once per run — only
    surface one conflict at a time.

    Args:
        conflict_id: UUID of the conflict to resolve.
        recommendation: Your genuine guidance on which document to trust and why (recency, authority, specificity), one or two sentences — not a restatement that a conflict exists.
        stances: List of items, one per document, each with keys document_id and stance, where stance is a short line on what that document claims about the conflicting point. Include every document in the conflict.
        recommended_document_id: UUID of the document you recommend trusting, used to highlight it on the card. Display hint only; the user still decides. Omit if you cannot recommend one.

    Returns:
        Resolution outcome string describing the user's decision.
    """
    user_id = config["configurable"]["user_id"]

    conflict = await fetch_conflict_with_docs(conflict_id, user_id)
    if not conflict:
        return f"Conflict {conflict_id} not found or already resolved."

    stance_by_id = {
        s.get("document_id"): s.get("stance", "")
        for s in (stances or [])
        if isinstance(s, dict)
    }
    documents = [
        {**doc, "stance": stance_by_id.get(doc["id"], "")}
        for doc in conflict["documents"]
    ]

    decision = interrupt({
        "conflict_id": conflict_id,
        "conflict_type": conflict["conflict_type"],
        "detail": conflict.get("detail") or "",
        "recommendation": recommendation,
        "recommended_document_id": recommended_document_id,
        "documents": documents,
    })

    action = decision.get("action", "reject")
    preferred_doc_id = decision.get("preferred_document_id")
    notes = decision.get("notes")

    await resolve_conflict_db(conflict_id, action, preferred_doc_id, notes, user_id)

    outcome = f"Conflict {conflict_id} {action}d."
    if preferred_doc_id:
        outcome += f" Preferred document: {preferred_doc_id}."
    return outcome
