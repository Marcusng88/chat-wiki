from pathlib import Path

from deepagents import HarnessProfile, create_deep_agent, register_harness_profile
from langchain.agents.middleware import ModelRetryMiddleware
from langgraph.checkpoint.memory import MemorySaver
from ag_ui_langgraph import LangGraphAgent

from app.agents.chat.subagents import A2UI_SUBAGENT
from app.agents.chat.tools import (
    list_docs,
    search_documents,
    get_wiki_page,
    search_chunks,
    check_conflicts,
    resolve_conflict,
)
from app.utils.model_provider import get_llm

_AGENTS_MD = str(Path(__file__).parent / "AGENTS.md")

register_harness_profile(
    "openai:gpt-5.4-nano-2026-03-17",
    HarnessProfile(
        excluded_tools=frozenset({"ls", "read_file", "write_file", "edit_file", "glob", "grep"}),
    ),
)

_checkpointer = MemorySaver()


def build_chat_agent() -> LangGraphAgent:
    graph = create_deep_agent(
        model=get_llm(),
        tools=[
            list_docs,
            search_documents,
            get_wiki_page,
            search_chunks,
            check_conflicts,
            resolve_conflict,
        ],
        subagents=[A2UI_SUBAGENT],
        memory=[_AGENTS_MD],
        middleware=[ModelRetryMiddleware(max_retries=3, backoff_factor=2.0)],
        checkpointer=_checkpointer,
        name="chat-agent",
        debug=True,
    )
    return LangGraphAgent(name="chat-agent", graph=graph)
