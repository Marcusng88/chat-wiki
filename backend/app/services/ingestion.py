import logging
from langchain_core.messages import HumanMessage
from psycopg.rows import dict_row

from app.agents.docs_ingestion.agent import build_document_processor_agent
from app.db.db import get_conn

logger = logging.getLogger(__name__)

SUPPORTED_TYPES = {"pdf", "md", "txt", "pptx", "image"}


async def run_ingestion(document_id: str, file_type: str) -> None:
    if file_type not in SUPPORTED_TYPES:
        logger.info("Unsupported file type %s for document %s", file_type, document_id)
        async with get_conn() as conn:
            async with conn.cursor(row_factory=dict_row) as cur:
                await cur.execute(
                    "UPDATE documents SET status = 'unsupported', updated_at = now() WHERE id = %s",
                    (document_id,),
                )
        return

    logger.info("Ingestion started for document %s", document_id)

    agent = build_document_processor_agent()
    await agent.ainvoke(
        {"messages": [HumanMessage(content=f"Process document_id={document_id}")]},
        config={"recursion_limit": 100},
    )

    logger.info("Ingestion complete for document %s", document_id)
