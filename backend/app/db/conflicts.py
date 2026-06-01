from psycopg.rows import dict_row

from app.db.db import get_conn

# Statuses that mean a conflict is still live (not yet handled by the user).
ACTIVE_CONFLICT_STATUSES = ("resolved", "dismissed")


async def fetch_unscanned_docs(user_id: str) -> list[dict]:
    """Ready docs the resolver has never scanned (scanned_at IS NULL)."""
    async with get_conn() as conn:
        async with conn.cursor(row_factory=dict_row) as cur:
            await cur.execute(
                """
                SELECT id::text, title, summary, created_at::text
                FROM documents
                WHERE user_id = %s AND status = 'ready' AND scanned_at IS NULL
                ORDER BY created_at ASC
                """,
                (user_id,),
            )
            return [dict(r) for r in await cur.fetchall()]


async def fetch_conflict_candidates(
    document_id: str,
    user_id: str,
    k: int = 5,
    threshold: float = 0.45,
) -> list[dict]:
    """Top-K *other* ready docs nearest to this doc by chunk-to-chunk cosine similarity.

    Recall-first narrowing only — the agent still judges whether a real conflict
    exists. O(K) per doc via the HNSW index; never O(N^2). Candidate net covers all
    ready docs regardless of scanned_at, so two new mutually-conflicting docs find
    each other.
    """
    async with get_conn() as conn:
        async with conn.cursor(row_factory=dict_row) as cur:
            await cur.execute(
                """
                SELECT d.id::text, d.title, d.summary, d.created_at::text,
                       1 - min(c2.embedding <=> c1.embedding) AS similarity
                FROM chunks c1
                JOIN chunks c2 ON c2.document_id <> c1.document_id
                JOIN documents d ON d.id = c2.document_id
                WHERE c1.document_id = %s AND d.user_id = %s AND d.status = 'ready'
                GROUP BY d.id
                HAVING 1 - min(c2.embedding <=> c1.embedding) >= %s
                ORDER BY similarity DESC
                LIMIT %s
                """,
                (document_id, user_id, threshold, k),
            )
            return [dict(r) for r in await cur.fetchall()]


async def fetch_doc_wiki(document_id: str, user_id: str) -> dict | None:
    """Synthesized wiki page + summary for deep judgment."""
    async with get_conn() as conn:
        async with conn.cursor(row_factory=dict_row) as cur:
            await cur.execute(
                """
                SELECT title, wiki_page, summary, created_at::text
                FROM documents
                WHERE id = %s AND user_id = %s AND status = 'ready'
                """,
                (document_id, user_id),
            )
            row = await cur.fetchone()
    return dict(row) if row else None


async def fetch_doc_chunks(
    document_id: str,
    user_id: str,
    vector: str,
    limit: int = 5,
) -> list[dict]:
    """Raw chunks of a doc nearest to a query vector — drill to exact facts.

    Wiki pages are lossy; a single contradicting row can be dropped from the
    summary. This lets the agent compare evidence fact-by-fact when wikis look
    similar but a fine-grained conflict is suspected.
    """
    async with get_conn() as conn:
        async with conn.cursor(row_factory=dict_row) as cur:
            await cur.execute(
                "SELECT 1 FROM documents WHERE id = %s AND user_id = %s AND status = 'ready'",
                (document_id, user_id),
            )
            if not await cur.fetchone():
                return []
            await cur.execute(
                """
                SELECT content, chunk_index
                FROM chunks
                WHERE document_id = %s
                ORDER BY embedding <=> %s::vector
                LIMIT %s
                """,
                (document_id, vector, limit),
            )
            return [dict(r) for r in await cur.fetchall()]


async def insert_conflict(
    user_id: str,
    document_ids: list[str],
    conflict_type: str,
    detail: str,
) -> dict:
    """Insert one conflict + one conflict_documents row per member doc.

    Dedup guard: skip if an active conflict already covers the exact same doc set
    (agent may re-propose a pair from both directions). Returns
    {"created": bool, "conflict_id": str|None, "reason": str}.
    """
    ids = sorted(set(document_ids))
    if len(ids) < 2:
        return {"created": False, "conflict_id": None, "reason": "needs >= 2 distinct docs"}

    async with get_conn() as conn:
        async with conn.cursor(row_factory=dict_row) as cur:
            # ownership check — every doc must belong to the user
            await cur.execute(
                "SELECT count(*) AS n FROM documents WHERE id = ANY(%s::uuid[]) AND user_id = %s",
                (ids, user_id),
            )
            if (await cur.fetchone())["n"] != len(ids):
                return {"created": False, "conflict_id": None, "reason": "doc not owned by user"}

            # dedup — any active conflict whose member set == ids exactly?
            await cur.execute(
                """
                SELECT c.id::text AS id
                FROM conflicts c
                JOIN conflict_documents cd ON cd.conflict_id = c.id
                WHERE c.user_id = %s AND c.status NOT IN ('resolved', 'dismissed')
                GROUP BY c.id
                HAVING array_agg(cd.document_id::text ORDER BY cd.document_id::text)
                       = %s::text[]
                """,
                (user_id, ids),
            )
            if dup := await cur.fetchone():
                return {"created": False, "conflict_id": dup["id"], "reason": "duplicate active conflict"}

            await cur.execute(
                """
                INSERT INTO conflicts (user_id, conflict_type, status, detail)
                VALUES (%s, %s, 'flagged', %s)
                RETURNING id::text
                """,
                (user_id, conflict_type, detail),
            )
            conflict_id = (await cur.fetchone())["id"]
            await cur.executemany(
                "INSERT INTO conflict_documents (conflict_id, document_id) VALUES (%s, %s)",
                [(conflict_id, doc_id) for doc_id in ids],
            )

    return {"created": True, "conflict_id": conflict_id, "reason": "created"}


async def set_doc_scanned(document_id: str, user_id: str) -> None:
    """Mark a doc scanned so the incremental scan never revisits it."""
    async with get_conn() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "UPDATE documents SET scanned_at = now() WHERE id = %s AND user_id = %s",
                (document_id, user_id),
            )


async def fetch_document_conflicts(document_id: str, user_id: str) -> list[dict]:
    async with get_conn() as conn:
        async with conn.cursor(row_factory=dict_row) as cur:
            await cur.execute(
                """
                SELECT
                    c.id::text,
                    c.conflict_type,
                    c.status,
                    c.detail,
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
                    c.detail,
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
