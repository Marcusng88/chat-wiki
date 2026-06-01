from pathlib import Path

from deepagents import create_deep_agent
from deepagents.backends.filesystem import FilesystemBackend
from langchain.agents.middleware import ModelRetryMiddleware
from langgraph.checkpoint.memory import MemorySaver
from ag_ui_langgraph import LangGraphAgent

from app.agents.chat.tools import (
    list_docs,
    search_documents,
    get_wiki_page,
    search_chunks,
    vector_search,
    check_conflicts,
    resolve_conflict,
)
from app.utils.model_provider import get_llm

_AGENTS_MD = str(Path(__file__).parent / "AGENTS.md")
_OPENUI_PROMPT_FILE = str(Path(__file__).parent / "openui_system_prompt.md")
_BACKEND_ROOT = FilesystemBackend(root_dir=str(Path(__file__).parent), virtual_mode=True)

_checkpointer = MemorySaver()


def build_chat_agent() -> LangGraphAgent:
    graph = create_deep_agent(
        model=get_llm(temperature=0.7),
        tools=[
            list_docs,
            search_documents,
            get_wiki_page,
            search_chunks,
            vector_search,
            check_conflicts,
            resolve_conflict,
        ],
        subagents=[],
        memory=[_AGENTS_MD, _OPENUI_PROMPT_FILE],
        backend=_BACKEND_ROOT,
        middleware=[ModelRetryMiddleware(max_retries=3, backoff_factor=2.0)],
        checkpointer=_checkpointer,
        name="chat-agent",
        debug=True,
    ).with_config({"recursion_limit": 100})
    return LangGraphAgent(name="chat-agent", graph=graph)
