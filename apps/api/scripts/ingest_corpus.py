"""Ingest coaching corpus into coaching_embeddings table.

Usage:
    PYTHONPATH=apps/api uv run --project apps/api python apps/api/scripts/ingest_corpus.py
"""

from __future__ import annotations

import hashlib
import os
from pathlib import Path

import psycopg
from langchain_text_splitters import MarkdownHeaderTextSplitter, RecursiveCharacterTextSplitter
from sentence_transformers import SentenceTransformer

SCRIPT_DIR = Path(__file__).parent
API_DIR = SCRIPT_DIR.parent
CORPUS_DIR = API_DIR / "corpus"

SOURCE_DIRS = {
    "crossfit_standard": CORPUS_DIR / "crossfit_standards",
    "programming_doc": CORPUS_DIR / "programming_docs",
    "coaching_note": CORPUS_DIR / "coaching_notes",
}

EMBED_MODEL = os.environ.get("EMBED_MODEL", "BAAI/bge-small-en-v1.5")

# ~300 tokens × 4 chars/token for English prose
CHUNK_CHARS = 300 * 4
CHUNK_OVERLAP_CHARS = 30 * 4

_MD_HEADERS = [("#", "h1"), ("##", "h2"), ("###", "h3")]
_header_splitter = MarkdownHeaderTextSplitter(
    headers_to_split_on=_MD_HEADERS,
    strip_headers=False,
)
_char_splitter = RecursiveCharacterTextSplitter(
    chunk_size=CHUNK_CHARS,
    chunk_overlap=CHUNK_OVERLAP_CHARS,
    separators=["\n\n", "\n", ". ", " ", ""],
)

DB_DSN = os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@127.0.0.1:54322/postgres")


def is_near_duplicate(vec: list[float], conn: psycopg.Connection) -> bool:  # type: ignore[type-arg]
    """Return True if an existing chunk has cosine similarity > 0.95 with this vector."""
    row = conn.execute(
        """
        SELECT 1 FROM coaching_embeddings
        WHERE 1 - (embedding <=> %s::vector) > 0.95
        LIMIT 1
        """,
        [vec],
    ).fetchone()
    return row is not None


def chunk_text(text: str, title: str) -> list[tuple[str, str, str]]:
    """Split Markdown by headers first, then recursively within large sections.

    Returns (chunk_title, body, section_path) triples.
    section_path is the breadcrumb string e.g. "Movement Standards › Air Squat".
    """
    header_docs = _header_splitter.split_text(text)
    chunks: list[tuple[str, str, str]] = []

    for doc in header_docs:
        parts = [
            doc.metadata.get("h1", ""),
            doc.metadata.get("h2", ""),
            doc.metadata.get("h3", ""),
        ]
        section_path = " › ".join(p for p in parts if p) or title
        section_title = section_path
        body = doc.page_content.strip()
        if not body:
            continue

        if len(body) <= CHUNK_CHARS:
            chunks.append((section_title, body, section_path))
        else:
            for i, sub in enumerate(_char_splitter.split_text(body)):
                chunk_title = f"{section_title} (part {i + 1})" if i > 0 else section_title
                chunks.append((chunk_title, sub.strip(), section_path))

    # Fallback for docs with no Markdown headers
    if not chunks:
        for i, sub in enumerate(_char_splitter.split_text(text)):
            chunk_title = f"{title} (part {i + 1})" if i > 0 else title
            chunks.append((chunk_title, sub.strip(), title))

    return chunks


def ingest() -> None:
    print(f"Loading embedder ({EMBED_MODEL})…")
    embedder = SentenceTransformer(EMBED_MODEL)

    all_rows: list[tuple[str, str, str, list[float], str, str, str, str, int]] = []

    # Pass 1: load known hashes to skip unchanged files entirely
    with psycopg.connect(DB_DSN) as check_conn:
        known: dict[str, str] = {
            row[0]: row[1]
            for row in check_conn.execute(
                "SELECT source_file, file_hash FROM coaching_embeddings"
                " WHERE source_file IS NOT NULL AND embedding_model = %s",
                [EMBED_MODEL],
            ).fetchall()
        }

    for source_type, directory in SOURCE_DIRS.items():
        if not directory.exists():
            print(f"  Skipping missing directory: {directory}")
            continue
        for md_file in sorted(directory.glob("*.md")):
            raw = md_file.read_text(encoding="utf-8")
            rel_path = str(md_file.relative_to(API_DIR))
            file_hash = hashlib.sha256(raw.encode()).hexdigest()

            if known.get(rel_path) == file_hash:
                print(f"  Skipping unchanged: {rel_path}")
                continue

            lines = raw.splitlines()
            title = md_file.stem.replace("_", " ").title()
            for line in lines:
                if line.startswith("# "):
                    title = line[2:].strip()
                    break

            chunks = chunk_text(raw, title)
            print(f"  {source_type}/{md_file.name}: {len(chunks)} chunks")
            for idx, (chunk_title, body, section_path) in enumerate(chunks):
                vec = embedder.encode(body).tolist()
                all_rows.append(
                    (
                        source_type,
                        chunk_title,
                        body,
                        vec,
                        rel_path,
                        file_hash,
                        EMBED_MODEL,
                        section_path,
                        idx,
                    )
                )

    if not all_rows:
        print("Nothing to update — all files unchanged.")
        return

    print(f"\nInserting {len(all_rows)} rows (near-duplicate check per chunk)…")
    inserted = skipped = 0
    with psycopg.connect(DB_DSN, autocommit=True) as conn:
        # Delete stale chunks for files that changed
        changed_files = list({row[4] for row in all_rows})
        conn.execute(
            "DELETE FROM coaching_embeddings WHERE source_file = ANY(%s) AND embedding_model = %s",
            [changed_files, EMBED_MODEL],
        )
        for (
            source_type,
            title,
            body,
            vec,
            rel_path,
            file_hash,
            model,
            section_path,
            idx,
        ) in all_rows:
            if is_near_duplicate(vec, conn):
                skipped += 1
                continue
            conn.execute(
                """
                INSERT INTO coaching_embeddings
                    (source_type, title, body, embedding,
                     source_file, file_hash, embedding_model, section_path, chunk_index, language)
                VALUES (%s, %s, %s, %s::vector, %s, %s, %s, %s, %s, 'en')
                """,
                [source_type, title, body, vec, rel_path, file_hash, model, section_path, idx],
            )
            inserted += 1
    print(f"Done. Inserted {inserted}, skipped {skipped} near-duplicates.")


if __name__ == "__main__":
    ingest()
