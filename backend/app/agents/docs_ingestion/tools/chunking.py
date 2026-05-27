import logging
from langchain_core.tools import tool
from langchain_text_splitters import RecursiveCharacterTextSplitter
from psycopg.rows import dict_row

from app.db.db import get_conn
from app.utils.model_provider import get_embeddings

logger = logging.getLogger(__name__)

_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
EMBEDDING_MODEL = "text-embedding-3-small"


@tool(parse_docstring=True)
async def chunk_and_embed(document_id: str, text: str) -> int:
    """Split extracted text into chunks, embed each chunk, and persist to the database.

    Use this AFTER extract_text and BEFORE read_chunks_batch. Call exactly once
    per document — re-calling clears and replaces any existing chunks. Do NOT
    call with an empty or truncated text string; pass the full output of
    extract_text unchanged.

    Chunks are split with overlap (size=1000, overlap=200) using
    RecursiveCharacterTextSplitter. Each chunk is embedded with
    text-embedding-3-small and stored in the chunks table with its vector.

    Args:
        document_id: UUID of the document these chunks belong to. Use exactly
            as provided — must match the document_id used in extract_text.
        text: Full extracted text from extract_text. Do not truncate or summarise.

    Returns:
        Number of chunks stored. A return value of 0 means the text produced no
        splittable content — treat as a failure and call update_status("failed_embed").

    Raises:
        RuntimeError: On database write failure.
    """
    logger.info("[chunk_and_embed] doc=%s text_len=%d", document_id, len(text))

    chunks = _splitter.split_text(text)
    logger.info("[chunk_and_embed] doc=%s chunks=%d", document_id, len(chunks))
    if not chunks:
        logger.warning("[chunk_and_embed] doc=%s no chunks produced", document_id)
        return 0

    embeddings_model = get_embeddings()
    logger.info("[chunk_and_embed] doc=%s embedding %d chunks via %s", document_id, len(chunks), EMBEDDING_MODEL)
    try:
        vectors = await embeddings_model.aembed_documents(chunks)
    except Exception:
        logger.exception("[chunk_and_embed] doc=%s embedding API call failed", document_id)
        raise
    logger.info("[chunk_and_embed] doc=%s got %d vectors", document_id, len(vectors))

    try:
        async with get_conn() as conn:
            async with conn.cursor(row_factory=dict_row) as cur:
                await cur.execute("DELETE FROM chunks WHERE document_id = %s", (document_id,))
                logger.info("[chunk_and_embed] doc=%s old chunks deleted", document_id)

                for idx, (chunk_text, vector) in enumerate(zip(chunks, vectors)):
                    await cur.execute(
                        """
                        INSERT INTO chunks (document_id, chunk_index, content, embedding, embedding_model)
                        VALUES (%s, %s, %s, %s::vector, %s)
                        """,
                        (document_id, idx, chunk_text, str(vector), EMBEDDING_MODEL),
                    )
                logger.info("[chunk_and_embed] doc=%s inserted %d rows", document_id, len(chunks))
    except Exception:
        logger.exception("[chunk_and_embed] doc=%s DB write failed", document_id)
        raise

    logger.info("[chunk_and_embed] doc=%s complete, stored %d chunks", document_id, len(chunks))
    return len(chunks)
