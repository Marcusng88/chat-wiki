from pathlib import Path

from deepagents import HarnessProfile, create_deep_agent, register_harness_profile
from langchain.agents.middleware import ModelRetryMiddleware, ToolRetryMiddleware

from app.agents.docs_ingestion.tools.chunking import chunk_and_embed
from app.agents.docs_ingestion.tools.extract import extract_text
from app.agents.docs_ingestion.tools.index import save_index
from app.agents.docs_ingestion.tools.status import update_status
from app.agents.docs_ingestion.tools.wiki import read_chunks_batch, save_wiki
from app.utils.model_provider import get_llm

_AGENTS_MD = str(Path(__file__).parent / "AGENTS.md")

register_harness_profile(
    "openai:gpt-5.4-nano-2026-03-17",
    HarnessProfile(
        excluded_tools=frozenset({"ls", "read_file", "write_file", "edit_file", "glob", "grep"}),
    ),
)


def build_document_processor_agent():
    llm = get_llm()

    tools = [
        extract_text,
        chunk_and_embed,
        read_chunks_batch,
        save_wiki,
        save_index,
        update_status,
    ]

    middleware = [
        ToolRetryMiddleware(
            tools=[extract_text, chunk_and_embed],
            retry_on=(TimeoutError, ConnectionError),
            max_retries=2,
        ),
        ModelRetryMiddleware(max_retries=3, backoff_factor=2.0),
    ]

    return create_deep_agent(
        model=llm,
        tools=tools,
        memory=[_AGENTS_MD],
        middleware=middleware,
        checkpointer=None,
        name="document-processor",
    )
