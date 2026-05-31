from pathlib import Path

from deepagents import create_deep_agent
from langchain.agents.middleware import ModelRetryMiddleware

from app.agents.conflict_resolver.tools.flag import mark_scanned, save_conflict
from app.agents.conflict_resolver.tools.scan import (
    find_conflict_candidates,
    get_doc_evidence,
    get_doc_wiki,
    list_unscanned_docs,
)
from app.utils.model_provider import get_llm

_AGENTS_MD = str(Path(__file__).parent / "AGENTS.md")


def build_conflict_resolver_agent():
    llm = get_llm()

    tools = [
        list_unscanned_docs,
        find_conflict_candidates,
        get_doc_wiki,
        get_doc_evidence,
        save_conflict,
        mark_scanned,
    ]

    middleware = [
        ModelRetryMiddleware(max_retries=3, backoff_factor=2.0),
    ]

    return create_deep_agent(
        model=llm,
        tools=tools,
        memory=[_AGENTS_MD],
        middleware=middleware,
        checkpointer=None,
        name="conflict-resolver",
        debug=True,
    )
