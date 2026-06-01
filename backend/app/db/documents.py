from psycopg.rows import dict_row

from app.db.db import get_conn


async def insert_document(user_id: str, title: str, file_type: str, storage_path: str) -> str:
    async with get_conn() as conn:
        async with conn.cursor(row_factory=dict_row) as cur:
            await cur.execute(
                """
                INSERT INTO documents (user_id, title, file_type, storage_path, status)
                VALUES (%s, %s, %s, %s, 'uploaded')
                RETURNING id
                """,
                (user_id, title, file_type, storage_path),
            )
            row = await cur.fetchone()
    return str(row["id"])


async def fetch_document(document_id: str, user_id: str) -> dict | None:
    async with get_conn() as conn:
        async with conn.cursor(row_factory=dict_row) as cur:
            await cur.execute(
                "SELECT id, file_type, status FROM documents WHERE id = %s AND user_id = %s",
                (document_id, user_id),
            )
            return await cur.fetchone()


async def fetch_document_storage_path(document_id: str, user_id: str) -> str | None:
    async with get_conn() as conn:
        async with conn.cursor(row_factory=dict_row) as cur:
            await cur.execute(
                "SELECT storage_path FROM documents WHERE id = %s AND user_id = %s",
                (document_id, user_id),
            )
            row = await cur.fetchone()
    return row["storage_path"] if row else None


async def fetch_document_list(user_id: str) -> list[dict]:
    async with get_conn() as conn:
        async with conn.cursor(row_factory=dict_row) as cur:
            await cur.execute(
                """
                SELECT
                    d.id::text,
                    d.title,
                    d.file_type,
                    d.status,
                    d.wiki_page,
                    d.summary,
                    COALESCE(d.topics, '{}') AS topics,
                    d.created_at,
                    d.scanned_at IS NOT NULL AS scanned,
                    EXISTS(
                        SELECT 1 FROM conflict_documents cd
                        JOIN conflicts c ON c.id = cd.conflict_id
                        WHERE cd.document_id = d.id
                          AND c.status NOT IN ('resolved', 'dismissed')
                    ) AS has_conflict
                FROM documents d
                WHERE d.user_id = %s
                ORDER BY d.created_at DESC
                """,
                (user_id,),
            )
            return await cur.fetchall()


async def fetch_chunks(document_id: str) -> list[dict]:
    async with get_conn() as conn:
        async with conn.cursor(row_factory=dict_row) as cur:
            await cur.execute(
                "SELECT content FROM chunks WHERE document_id = %s ORDER BY chunk_index",
                (document_id,),
            )
            return await cur.fetchall()


async def remove_document(document_id: str, user_id: str) -> None:
    async with get_conn() as conn:
        async with conn.cursor() as cur:
            # Delete any conflicts this document participates in. conflict_documents
            # rows cascade from both the conflict and the document FKs.
            await cur.execute(
                """
                DELETE FROM conflicts
                WHERE user_id = %s
                  AND (
                    id IN (
                        SELECT conflict_id FROM conflict_documents
                        WHERE document_id = %s
                    )
                    OR preferred_document_id = %s
                  )
                """,
                (user_id, document_id, document_id),
            )
            await cur.execute(
                "DELETE FROM documents WHERE id = %s AND user_id = %s",
                (document_id, user_id),
            )
