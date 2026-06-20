"""Hybrid RAG retrieval: RRF fusion of vector cosine + full-text search."""

from __future__ import annotations

from functools import lru_cache

import psycopg
from sentence_transformers import SentenceTransformer


@lru_cache(maxsize=1)
def _embedder() -> SentenceTransformer:
    return SentenceTransformer("BAAI/bge-small-en-v1.5")


async def hybrid_retrieve(
    query: str, db: psycopg.AsyncConnection[object], top_k: int = 5
) -> list[dict[str, object]]:
    """Reciprocal Rank Fusion of vector + full-text results."""
    q_vec = _embedder().encode(query).tolist()

    sql = """
    WITH vector_ranked AS (
        SELECT id,
               1 / (row_number() OVER (ORDER BY embedding <=> %s::vector) + 60.0) AS rrf_score
        FROM coaching_embeddings
        ORDER BY embedding <=> %s::vector LIMIT 20
    ),
    fts_ranked AS (
        SELECT id,
               1 / (row_number() OVER (ORDER BY ts_rank(ts_vec, q) DESC) + 60.0) AS rrf_score
        FROM coaching_embeddings, plainto_tsquery('english', %s) q
        WHERE ts_vec @@ q
        ORDER BY ts_rank(ts_vec, q) DESC LIMIT 20
    )
    SELECT e.id::text, e.title, e.body, e.source_type,
           COALESCE(v.rrf_score, 0) + COALESCE(f.rrf_score, 0) AS score
    FROM coaching_embeddings e
    LEFT JOIN vector_ranked v USING (id)
    LEFT JOIN fts_ranked f USING (id)
    WHERE v.id IS NOT NULL OR f.id IS NOT NULL
    ORDER BY score DESC LIMIT %s
    """
    async with db.cursor() as cur:  # type: ignore[attr-defined]
        await cur.execute(sql, [q_vec, q_vec, query, top_k])
        if cur.description is None:
            return []
        cols = [d.name for d in cur.description]
        rows = await cur.fetchall()

    return [dict(zip(cols, row, strict=False)) for row in rows]  # type: ignore[call-overload]
