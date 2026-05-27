from psycopg.rows import dict_row

from app.db.db import get_conn


async def fetch_document_conflicts(document_id: str, user_id: str) -> list[dict]:
    async with get_conn() as conn:
        async with conn.cursor(row_factory=dict_row) as cur:
            await cur.execute(
                """
                SELECT
                    c.id::text,
                    c.conflict_type,
                    c.status,
                    c.preferred_document_id::text,
                    array_agg(
                        json_build_object('id', d.id::text, 'title', d.title)
                    ) AS documents
                FROM conflicts c
                JOIN conflict_documents cd ON cd.conflict_id = c.id
                JOIN documents d ON d.id = cd.document_id
                WHERE cd.document_id = %s
                  AND c.user_id = %s
                  AND c.status NOT IN ('resolved', 'dismissed')
                GROUP BY c.id
                """,
                (document_id, user_id),
            )
            return await cur.fetchall()


async def fetch_conflict_with_docs(conflict_id: str, user_id: str) -> dict | None:
    async with get_conn() as conn:
        async with conn.cursor(row_factory=dict_row) as cur:
            await cur.execute(
                """
                SELECT
                    c.id::text,
                    c.conflict_type,
                    c.status,
                    array_agg(
                        json_build_object(
                            'id', d.id::text,
                            'title', d.title,
                            'created_at', d.created_at::text
                        )
                    ) AS documents
                FROM conflicts c
                JOIN conflict_documents cd ON cd.conflict_id = c.id
                JOIN documents d ON d.id = cd.document_id
                WHERE c.id = %s AND c.user_id = %s
                GROUP BY c.id
                """,
                (conflict_id, user_id),
            )
            return await cur.fetchone()


async def resolve_conflict_db(
    conflict_id: str,
    action: str,
    preferred_doc_id: str | None,
    notes: str | None,
    user_id: str,
) -> None:
    if action == "reject":
        new_status = "dismissed"
        preferred_doc_id = None
    else:
        new_status = "resolved"

    async with get_conn() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                UPDATE conflicts
                SET status = %s,
                    preferred_document_id = %s,
                    resolution_notes = %s,
                    updated_at = now()
                WHERE id = %s AND user_id = %s
                """,
                (new_status, preferred_doc_id, notes, conflict_id, user_id),
            )
