import logging
import re
from langchain_core.tools import tool
from langchain_text_splitters import RecursiveCharacterTextSplitter
from psycopg.rows import dict_row

from app.db.db import get_conn
from app.utils.model_provider import get_embeddings

logger = logging.getLogger(__name__)

_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
EMBEDDING_MODEL = "text-embedding-3-small"

# Page/slide markers injected by extract_text, e.g. "[Page 3]", "[Slide 4]",
# "[Page 3 Image 1]". We lift them into the chunks.page_ref column for citations.
_PAGE_MARKER = re.compile(r"\[(Page|Slide) (\d+)")


def derive_page_refs(chunks: list[str]) -> list[str | None]:
    """Map each chunk to a page/slide reference parsed from extract_text markers.

    A chunk's page_ref is the first marker found inside it. Chunks without a
    marker (overlap splits) inherit the last marker seen in a prior chunk.
    Returns None for chunks before any marker appears.
    """
    refs: list[str | None] = []
    carried: str | None = None
    for chunk in chunks:
        matches = _PAGE_MARKER.findall(chunk)
        if matches:
            kind, num = matches[0]
            refs.append(f"{kind} {num}")
            last_kind, last_num = matches[-1]
            carried = f"{last_kind} {last_num}"
        else:
            refs.append(carried)
    return refs


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

    page_refs = derive_page_refs(chunks)

    try:
        async with get_conn() as conn:
            async with conn.cursor(row_factory=dict_row) as cur:
                await cur.execute("DELETE FROM chunks WHERE document_id = %s", (document_id,))
                logger.info("[chunk_and_embed] doc=%s old chunks deleted", document_id)

                for idx, (chunk_text, vector, page_ref) in enumerate(zip(chunks, vectors, page_refs)):
                    await cur.execute(
                        """
                        INSERT INTO chunks (document_id, chunk_index, content, page_ref, embedding, embedding_model)
                        VALUES (%s, %s, %s, %s, %s::vector, %s)
                        """,
                        (document_id, idx, chunk_text, page_ref, str(vector), EMBEDDING_MODEL),
                    )
                logger.info("[chunk_and_embed] doc=%s inserted %d rows", document_id, len(chunks))
    except Exception:
        logger.exception("[chunk_and_embed] doc=%s DB write failed", document_id)
        raise

    logger.info("[chunk_and_embed] doc=%s complete, stored %d chunks", document_id, len(chunks))
    return len(chunks)
