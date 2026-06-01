"""Harness guard for the chat agent.

The model can read a tool's error result and still choose to give up — in the
conflict flow it would surface a "conflict blocked" card instead of retrying
``resolve_conflict`` with a stance for every document. A prompt rule cannot stop
that; control flow can. This middleware enforces the invariant in the harness:

    while a conflict has been surfaced this run and the user has NOT seen the
    interactive card yet, the model may not end its turn with a final answer —
    it is bounced back to the model node with a corrective instruction.

Detection is pure message-scan (no DB, no user_id): the relevant ToolMessages
already live in ``state["messages"]``.

A bounded nudge counter prevents an infinite model->model loop if the model
keeps refusing; after the cap the guard yields so the turn can end gracefully.
"""

from typing import Any

from langchain.agents.middleware import after_model, AgentState
from langchain_core.messages import AIMessage, SystemMessage, ToolMessage
from langgraph.runtime import Runtime
from typing_extensions import NotRequired

# Markers emitted by resolve_conflict BEFORE any interrupt fires. If a
# resolve_conflict result is one of these, the card was never shown — the model
# bailed at validation. Any other resolve_conflict result means the interrupt
# fired (approve / reject / modify), so the user has seen the card and their
# decision — including a deliberate "modify, stay open" — must be respected.
_REJECTION_PREFIX = "Did not surface the conflict"
_NOT_FOUND_MARKER = "not found or already resolved"

# Max times the guard bounces the model in one turn before yielding. Keeps a
# stubborn model from looping forever (ToolCallLimit can't catch a no-tool loop).
_MAX_NUDGES = 2

_CORRECTIVE = (
    "STOP. You surfaced a document conflict this turn but never showed the user "
    "the resolution card. You may not answer until it is surfaced. Call "
    "`resolve_conflict` with a `stances` entry (document_id + one-line claim) for "
    "EVERY document in the conflict. Drill each document's chunks with "
    "`search_chunks` first if you lack a stance. Do NOT emit a final answer or a "
    "warning/Callout in place of the card."
)


class ConflictGuardState(AgentState):
    conflict_nudges: NotRequired[int]


def _conflict_surfaced(messages: list) -> bool:
    """A check_conflicts call returned at least one active conflict this run."""
    for m in messages:
        if isinstance(m, ToolMessage) and m.name == "check_conflicts":
            content = (m.content or "")
            if isinstance(content, str) and content.strip() not in ("", "[]"):
                return True
    return False


def _card_shown(messages: list) -> bool:
    """A resolve_conflict result exists that is NOT a pre-interrupt bail.

    The validation rejection and the not-found early return both happen before
    interrupt(); anything else means the card actually rendered.
    """
    for m in messages:
        if isinstance(m, ToolMessage) and m.name == "resolve_conflict":
            content = m.content if isinstance(m.content, str) else str(m.content)
            stripped = content.strip()
            if stripped.startswith(_REJECTION_PREFIX):
                continue
            if _NOT_FOUND_MARKER in stripped:
                continue
            return True
    return False


@after_model(state_schema=ConflictGuardState, can_jump_to=["model"])
def conflict_guard(state: ConflictGuardState, runtime: Runtime) -> dict[str, Any] | None:
    messages = state["messages"]
    if not messages:
        return None

    last = messages[-1]
    # Still working — model requested a tool. Let the loop run.
    if not isinstance(last, AIMessage) or last.tool_calls:
        return None

    # Final answer attempted. Block only if a conflict is open and unsurfaced.
    if not _conflict_surfaced(messages) or _card_shown(messages):
        return None

    nudges = state.get("conflict_nudges", 0)
    if nudges >= _MAX_NUDGES:
        # Yield to avoid an infinite model->model bounce; turn ends.
        return None

    return {
        "jump_to": "model",
        "conflict_nudges": nudges + 1,
        "messages": [SystemMessage(content=_CORRECTIVE)],
    }
