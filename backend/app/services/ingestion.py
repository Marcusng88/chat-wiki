import logging

logger = logging.getLogger(__name__)

SUPPORTED_TYPES = {"pdf", "md", "txt", "pptx", "image"}


async def run_ingestion(document_id: str, file_type: str) -> None:
    if file_type not in SUPPORTED_TYPES:
        logger.info("Unsupported file type %s for document %s", file_type, document_id)
        return

    logger.info("Ingestion started for document %s", document_id)
    # Document Processor DeepAgent invoked here in next phase
    logger.info("Ingestion complete for document %s", document_id)
