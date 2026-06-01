# Plan: Conflict Resolver DeepAgent

## Context

The `conflicts` table is empty (0 rows) and **nothing populates it**. The consumer side is already
built — the chat agent surfaces conflicts (`check_conflicts`, `resolve_conflict` HITL `interrupt()`),
`list_docs`/`search_documents` expose `has_conflict`, and the frontend Resolver button exists with a
`// TODO: call POST /agent/resolve` (`LeftPanel.tsx:65`). The missing piece is the **producer**: an
agent that scans documents, detects conflicts, and inserts `conflicts` + `conflict_documents` rows
(`status='flagged'`). This plan builds that Resolver DeepAgent.

Design is grounded in research (KARMA multi-agent KG conflict detection; ASDC scalable blocking;
dataroots knowledgebase_guardian; Karpathy LLM-wiki "lint"). Two hard constraints from the user:
**(1) scalable as the corpus grows, (2) no hardcoded conflict logic — the AI agent must judge.**

### Decisions locked (via grilling)
- **Transport:** BackgroundTask + existing document poll. No SSE (resolver output is DB rows, not chat tokens).
- **Detection:** embedding-narrow → LLM-judge-on-wiki. Deterministic code does *only* retrieval/IO;
  the agent makes every judgment (conflict y/n, type, grouping, recommendation).
- **Scalability:** incremental — scan only docs where `scanned_at IS NULL`; each scanned doc is compared
  only to its top-K nearest neighbors via pgvector. **O(K) per new doc, never O(N²).**
- **Grouping:** N-way. One conflict row may hold 2+ docs arguing the same claim; the agent decides grouping.
- **Suggested winner:** prose in `conflicts.detail` only. `preferred_document_id` stays NULL until the
  user commits it at HITL (preserves "user decides" invariant).
- **Run scope:** one button-press scans all of the user's unscanned `ready` docs.

## Schema migration (Supabase `apply_migration`)

```sql
ALTER TABLE documents ADD COLUMN scanned_at timestamptz;     -- NULL = never scanned by resolver
ALTER TABLE conflicts ADD COLUMN detail text;                -- resolver's explanation + suggested winner
```
Also verify a vector index exists on `chunks.embedding`; if absent, add for KNN scalability:
```sql
CREATE INDEX IF NOT EXISTS chunks_embedding_hnsw
  ON chunks USING hnsw (embedding vector_cosine_ops);
```
`conflict_type` values: `duplicate | outdated | contradictory` (PRD §14.3). `conflict_documents` has no
`role` column (PRD §24 is stale) — membership only, fine for N-way.

## Backend

### DB layer — extend `backend/app/db/conflicts.py` (keep SQL here, tools stay thin; mirrors existing `hitl.py`→`conflicts.py` split)
- `fetch_unscanned_docs(user_id)` → `[{id,title,summary,created_at}]` where `status='ready' AND scanned_at IS NULL`.
- `fetch_conflict_candidates(document_id, user_id, k=5)` → top-K *other* ready docs by chunk-to-chunk
  similarity, recency included. Scalable narrowing query:
  ```sql
  SELECT d.id::text, d.title, d.summary, d.created_at::text,
         1 - min(c2.embedding <=> c1.embedding) AS similarity
  FROM chunks c1
  JOIN chunks c2 ON c2.document_id <> c1.document_id
  JOIN documents d ON d.id = c2.document_id
  WHERE c1.document_id = %s AND d.user_id = %s AND d.status = 'ready'
  GROUP BY d.id
  HAVING 1 - min(c2.embedding <=> c1.embedding) >= %s   -- loose recall-first threshold, e.g. 0.7
  ORDER BY similarity DESC
  LIMIT %s
  ```
  (Candidate net is *all* ready docs regardless of scanned state, so two new mutually-conflicting docs
  still find each other.) Threshold/K are retrieval knobs, **not** conflict logic — the agent still judges.
- `fetch_doc_wiki(document_id, user_id)` → `{title, wiki_page, created_at}` for deep judgment.
- `insert_conflict(user_id, document_ids, conflict_type, detail)` → insert one `conflicts` row +
  one `conflict_documents` row per id. **Dedup guard:** before insert, skip if an active conflict
  (status not in resolved/dismissed) already covers the exact same document set (handles agent
  re-proposing a pair from both directions). Require `len(document_ids) >= 2`, all owned by user.
- `set_doc_scanned(document_id, user_id)` → `UPDATE documents SET scanned_at = now()`.

### Resolver agent (new dir `backend/app/agents/resolver/`, mirror `docs_ingestion/`)
- `tools/scan.py` (read tools): `list_unscanned_docs`, `find_conflict_candidates`, `get_doc_wiki`.
  Read `user_id` from `config["configurable"]["user_id"]` (same pattern as chat retrieval tools).
- `tools/flag.py` (write tools): `save_conflict(document_ids, conflict_type, detail)`, `mark_scanned(document_id)`.
- `tools/__init__.py` exports all five.
- `agent.py` → `build_resolver_agent()` via `create_deep_agent` (model=`get_llm()`, the five tools,
  `memory=[AGENTS.md]`, `ModelRetryMiddleware`, `checkpointer=None`, `name="resolver"`).
- `AGENTS.md` (system prompt) — the agent loop:
  1. `write_todos` to plan.
  2. `list_unscanned_docs`. For **each** doc:
  3. `find_conflict_candidates(doc)`; if none → `mark_scanned(doc)` and continue.
  4. `get_doc_wiki` on the source + promising candidates; **reason** (KARMA criteria): duplicate /
     outdated (newer `created_at` supersedes) / contradictory / none.
  5. **Group** docs arguing the same claim into one conflict; `save_conflict(ids, type, detail)` where
     `detail` = plain explanation + suggested winner ("Doc B (newer) likely correct on price").
  6. `mark_scanned(doc)` — **always**, even when clean, or it rescans forever.
  Hard rules: never write `preferred_document_id`; never delete/mutate docs/wiki; one `save_conflict`
  per distinct claim group; don't fabricate conflicts when wiki pages agree.

### Service + endpoint
- `backend/app/services/resolution.py` → `run_resolver(user_id)`: build agent, `ainvoke` with
  `HumanMessage("Scan all unscanned documents for conflicts.")` and
  `config={"configurable": {"user_id": user_id}, "recursion_limit": 150}`. Mirrors `services/ingestion.py`.
- `backend/app/api/resolve.py` → `POST /agent/resolve` (router prefix `/agent`, coexists with chat):
  `Depends(get_user_id)` → `background_tasks.add_task(run_resolver, user_id)` → return `202 {"ok": true}`.
- `backend/main.py` → include `resolve_router`.

## Frontend (minimal — button already exists)
- `frontend/lib/api.ts` → add `resolveConflicts(): Promise<void>` = `apiFetch('/agent/resolve', {method:'POST'})`.
- `frontend/components/LeftPanel.tsx` → replace the `// TODO` (line 65) with `await resolveConflicts()`,
  then trigger document refetch so new `has_conflict` flags appear (resolver runs in background — kick a
  short re-poll of `listDocuments`, or extend `useDocuments` poll to also run briefly after a resolve).

## Tests (TDD — write first)
- `backend/tests/test_resolver_db.py`: `insert_conflict` creates conflict + N membership rows; dedup
  skips identical active set; `set_doc_scanned` sets timestamp; `fetch_unscanned_docs` excludes scanned.
- `backend/tests/test_resolver_candidates.py`: `fetch_conflict_candidates` returns ranked other-doc
  matches above threshold, excludes the source doc and non-ready docs.
- Seed via existing test DB fixtures / a throwaway user; reuse `chunk_and_embed` to populate vectors.

## Verification (end-to-end)
1. Apply migration; confirm columns + index via `mcp__supabase__list_tables`.
2. `uv run pytest backend/tests/test_resolver_*.py`.
3. Seed ≥2 conflicting docs (e.g. two notes with different prices) through normal ingestion → `ready`.
4. `POST /agent/resolve` (curl with a real bearer) → 202. Watch backend logs for the agent loop.
5. `mcp__supabase__execute_sql`: confirm `conflicts` rows (status `flagged`, `detail` populated,
   `preferred_document_id` NULL) + matching `conflict_documents`, and `documents.scanned_at` set on all.
6. Re-run `POST /agent/resolve` → no new rows (dedup + scanned_at hold).
7. In the app: Resolver button → conflict count appears; open chat on the conflicting topic →
   Main agent's HITL card fires (existing path), now able to read `conflicts.detail`.

---

## Research sources

- [KARMA: Multi-Agent LLMs for KG Enrichment](https://arxiv.org/pdf/2502.06472) — agent roles + recency/authority/support criteria
- [ASDC: Anchor-Guided Semantic Double-Clustering](https://ieeexplore.ieee.org/abstract/document/11185903/) — scalable blocking, 98% pair reduction
- [knowledgebase_guardian](https://github.com/datarootsio/knowledgebase_guardian) — new-vs-neighbors embedding narrowing
- [Contradiction Detection in RAG](https://arxiv.org/html/2504.00180v1) — LLMs weak at raw contradiction accuracy → narrow + judge clean text
- [Karpathy LLM-wiki "lint"](https://blog.starmorph.com/blog/karpathy-llm-wiki-knowledge-base-guide) — separate scan over synthesized wiki pages
