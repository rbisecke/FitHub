"""Tests for the cardio equipment conversion corpus document.

Verifies the document exists, follows the expected markdown format, and
chunks correctly via the ingest_corpus chunking pipeline.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

# Make scripts/ importable so we can reuse the chunking logic
sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))

from ingest_corpus import chunk_text

CORPUS_FILE = (
    Path(__file__).parent.parent
    / "corpus"
    / "crossfit_standards"
    / "cardio_equipment_conversions.md"
)

REQUIRED_SECTIONS = [
    "Section 1",
    "Section 2",
    "Section 3",
    "Section 4",
    "Section 5",
]

REQUIRED_CONTENT = [
    # Distance table values
    "500m",
    "1,000m",
    "2,000m",
    "4,000m",
    # Calorie table values
    "20 cal",
    "40 cal",
    "80 cal",
    "12–14 cal",
    # Machine names
    "Row Erg",
    "Ski Erg",
    "C2 BikeErg",
    "Assault",
    # Key concepts
    "Reversibility",
    "calorie",
    "distance",
]


@pytest.fixture(scope="module")
def corpus_text() -> str:
    assert CORPUS_FILE.exists(), (
        f"Cardio corpus document not found at {CORPUS_FILE}. "
        "Create apps/api/corpus/crossfit_standards/cardio_equipment_conversions.md"
    )
    return CORPUS_FILE.read_text(encoding="utf-8")


def test_corpus_file_exists() -> None:
    assert CORPUS_FILE.exists()


def test_corpus_has_all_five_sections(corpus_text: str) -> None:
    for section in REQUIRED_SECTIONS:
        assert section in corpus_text, f"Missing '{section}' in corpus document"


def test_corpus_contains_required_content(corpus_text: str) -> None:
    for term in REQUIRED_CONTENT:
        assert term in corpus_text, f"Expected term '{term}' not found in cardio corpus document"


def test_corpus_assault_bike_distance_shows_dash(corpus_text: str) -> None:
    """Assault bike distance entries must indicate calorie-only usage."""
    # The document should note that assault bike uses "—" or "use calories"
    assert "use calories" in corpus_text.lower() or "— (use calories)" in corpus_text


def test_corpus_chunks_into_multiple_sections(corpus_text: str) -> None:
    """The document should produce multiple chunks (one per section at minimum)."""
    chunks = chunk_text(corpus_text, "Cardio Equipment Conversions")
    assert len(chunks) >= 5, f"Expected at least 5 chunks (one per section), got {len(chunks)}"


def test_corpus_chunks_do_not_mix_sections(corpus_text: str) -> None:
    """Section 1 (distance) chunks must not contain Section 2 (calorie) header text."""
    chunks = chunk_text(corpus_text, "Cardio Equipment Conversions")
    for title, body, _ in chunks:
        if "Section 1" in title or "Distance Equivalency" in title:
            # Section 1 chunks should not bleed into Section 2 header
            assert "Calorie Equivalency Table" not in body or "Section 2" not in body


def test_corpus_reversibility_section_present(corpus_text: str) -> None:
    """Section 5 on reversibility must include concrete examples."""
    assert "500m row" in corpus_text
    assert "400m run" in corpus_text
