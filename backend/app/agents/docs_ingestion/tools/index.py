from langchain_core.tools import tool
from psycopg.rows import dict_row

from app.db.db import get_conn


@tool(parse_docstring=True)
async def save_index(document_id: str, entries: list[dict]) -> str:
    """Persist index entries for a document after the wiki page is saved.

    Use this AFTER save_wiki and BEFORE the final update_status calls. Call
    exactly once. Provide one entry per wiki section (5 entries expected).
    Re-calling clears and replaces any existing index entries for this document.

    Each dict in entries must have:
      - section_title (str): exact heading from the wiki (e.g. "Key Concepts")
      - keywords (list[str]): 3-10 search terms; include synonyms and abbreviations
      - summary (str, optional): one sentence describing the section

    Args:
        document_id: UUID of the document. Use exactly as provided.
        entries: List of dicts, one per wiki section. Empty list is a no-op.

    Returns:
        Confirmation string with count of entries saved.

    Raises:
        RuntimeError: On database write failure.
    """
    if not entries:
        return "No entries to save"

    async with get_conn() as conn:
        async with conn.cursor(row_factory=dict_row) as cur:
            await cur.execute("DELETE FROM index_entries WHERE document_id = %s", (document_id,))

            for entry in entries:
                section_title = entry.get("section_title", "")
                keywords = entry.get("keywords", [])
                summary = entry.get("summary")

                await cur.execute(
                    """
                    INSERT INTO index_entries (document_id, section_title, keywords, summary)
                    VALUES (%s, %s, %s, %s)
                    """,
                    (document_id, section_title, keywords, summary),
                )

    return f"Saved {len(entries)} index entries for document {document_id}"
