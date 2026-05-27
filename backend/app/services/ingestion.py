import logging
from langchain_core.messages import HumanMessage

from app.agents.docs_ingestion.agent import build_document_processor_agent

logger = logging.getLogger(__name__)

SUPPORTED_TYPES = {"pdf", "md", "txt", "pptx", "image"}


async def run_ingestion(document_id: str, file_type: str) -> None:
    if file_type not in SUPPORTED_TYPES:
        logger.info("Unsupported file type %s for document %s", file_type, document_id)
        return

    logger.info("Ingestion started for document %s", document_id)

    agent = build_document_processor_agent()
    await agent.ainvoke(
        {"messages": [HumanMessage(content=f"Process document_id={document_id}")]},
        config={"recursion_limit": 100},
    )

    logger.info("Ingestion complete for document %s", document_id)
