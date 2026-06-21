"""Unit tests for the Markdown-aware chunking in ingest_corpus.py."""

from __future__ import annotations

import sys
from pathlib import Path

# Make scripts/ importable
sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))

from ingest_corpus import chunk_text


def test_header_aware_chunks_do_not_cross_sections() -> None:
    md = "# Doc\n\n## Section A\n\nContent about A.\n\n## Section B\n\nContent about B."
    chunks = chunk_text(md, "Doc")
    titles = [t for t, _, _ in chunks]
    bodies = [b for _, b, _ in chunks]
    assert any("Section A" in t for t in titles)
    assert any("Section B" in t for t in titles)
    for title, body in zip(titles, bodies, strict=False):
        if "Section B" in title:
            assert "Content about A" not in body


def test_section_path_breadcrumb() -> None:
    md = "# Guide\n\n## Standards\n\n### Squat\n\nFull depth required."
    chunks = chunk_text(md, "Guide")
    _, _, section_path = chunks[0]
    assert "Guide" in section_path or "Standards" in section_path
    assert "Squat" in section_path


def test_fallback_for_doc_without_headers() -> None:
    md = "No headers here. Just a long paragraph. " * 100
    chunks = chunk_text(md, "Fallback Doc")
    assert len(chunks) >= 1
    assert all(body for _, body, _ in chunks)


def test_small_section_stays_as_one_chunk() -> None:
    md = "# Fran\n\n21-15-9 Thrusters and Pull-ups. Elite time sub-2:00."
    chunks = chunk_text(md, "Fran")
    assert len(chunks) == 1


def test_large_section_is_split() -> None:
    section_body = "Word " * 400  # well over 300-token threshold
    md = f"# Doc\n\n## Big Section\n\n{section_body}"
    chunks = chunk_text(md, "Doc")
    assert len(chunks) > 1
    assert all("Big Section" in t for t, _, _ in chunks)
