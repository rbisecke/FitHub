"""Ingest coaching corpus into coaching_embeddings table.

Usage:
    PYTHONPATH=apps/api uv run --project apps/api python apps/api/scripts/ingest_corpus.py
"""

from __future__ import annotations

import os
from pathlib import Path

import psycopg
from sentence_transformers import SentenceTransformer

# Resolve corpus root relative to this script
SCRIPT_DIR = Path(__file__).parent
API_DIR = SCRIPT_DIR.parent
CORPUS_DIR = API_DIR / "corpus"

SOURCE_DIRS = {
    "crossfit_standard": CORPUS_DIR / "crossfit_standards",
    "programming_doc": CORPUS_DIR / "programming_docs",
    "coaching_note": CORPUS_DIR / "coaching_notes",
}

CHUNK_SIZE = 400  # tokens (approximate via word count × 1.3)
CHUNK_OVERLAP = 50

DB_DSN = os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@127.0.0.1:54322/postgres")


def chunk_text(text: str, title: str, chunk_size: int = CHUNK_SIZE) -> list[tuple[str, str]]:
    """Split text into ~chunk_size-token chunks with overlap. Returns (chunk_title, body) pairs."""
    words = text.split()
    chunks = []
    step = chunk_size - CHUNK_OVERLAP
    for i in range(0, len(words), step):
        chunk = " ".join(words[i : i + chunk_size])
        section = f"{title} (part {len(chunks) + 1})" if i > 0 else title
        chunks.append((section, chunk))
    return chunks


def ingest() -> None:
    print("Loading embedder…")
    embedder = SentenceTransformer("BAAI/bge-small-en-v1.5")

    all_rows: list[tuple[str, str, str, list[float]]] = []

    for source_type, directory in SOURCE_DIRS.items():
        if not directory.exists():
            print(f"  Skipping missing directory: {directory}")
            continue
        for md_file in sorted(directory.glob("*.md")):
            raw = md_file.read_text(encoding="utf-8")
            lines = raw.splitlines()
            # Use first H1 as title, fall back to filename
            title = md_file.stem.replace("_", " ").title()
            for line in lines:
                if line.startswith("# "):
                    title = line[2:].strip()
                    break

            chunks = chunk_text(raw, title)
            print(f"  {source_type}/{md_file.name}: {len(chunks)} chunks")
            for chunk_title, body in chunks:
                vec = embedder.encode(body).tolist()
                all_rows.append((source_type, chunk_title, body, vec))

    print(f"\nInserting {len(all_rows)} rows…")
    with psycopg.connect(DB_DSN, autocommit=True) as conn:
        # Service-role bypass — this script is a dev tool, not user-facing
        conn.execute(
            "DELETE FROM coaching_embeddings WHERE source_type = ANY(%s)",
            [list(SOURCE_DIRS.keys())],
        )
        with conn.pipeline():
            for source_type, title, body, vec in all_rows:
                conn.execute(
                    """
                    INSERT INTO coaching_embeddings (source_type, title, body, embedding)
                    VALUES (%s, %s, %s, %s::vector)
                    """,
                    [source_type, title, body, vec],
                )
    print("Done.")


if __name__ == "__main__":
    ingest()
