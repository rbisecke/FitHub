"""Convert PDFs in corpus/pdf/ to Markdown for ingestion via ingest_corpus.py.

Install marker-pdf once (developer machine only, not an API dependency):
    pip install marker-pdf

Usage:
    uv run --project apps/api python apps/api/scripts/ingest_pdf.py
    # Then run ingest_corpus.py as normal — the generated .md files are picked up automatically.
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
API_DIR = SCRIPT_DIR.parent
PDF_DIR = API_DIR / "corpus" / "pdf"


# Map PDF source dirs to their target corpus output dirs.
# Override by passing --output_dir to marker_single if needed.
OUTPUT_DIRS: dict[str, Path] = {
    "crossfit": API_DIR / "corpus" / "crossfit_standards",
    "programming": API_DIR / "corpus" / "programming_docs",
    "coaching": API_DIR / "corpus" / "coaching_notes",
}
DEFAULT_OUTPUT = API_DIR / "corpus" / "crossfit_standards"


def convert_pdfs(output_dir: Path = DEFAULT_OUTPUT) -> None:
    pdfs = sorted(PDF_DIR.glob("*.pdf"))
    if not pdfs:
        print(f"No PDFs found in {PDF_DIR}")
        print(f"Download source files per {PDF_DIR / 'SOURCES.md'} and place them here.")
        return

    try:
        subprocess.run(["marker_single", "--help"], capture_output=True, check=True)
    except FileNotFoundError, subprocess.CalledProcessError:
        print("marker-pdf not installed. Run: pip install marker-pdf")
        sys.exit(1)

    output_dir.mkdir(parents=True, exist_ok=True)
    for pdf in pdfs:
        print(f"Converting {pdf.name}…")
        subprocess.run(
            ["marker_single", str(pdf), "--output_dir", str(output_dir)],
            check=True,
        )
        print(f"  → {output_dir / pdf.stem}.md")

    print(f"\nConverted {len(pdfs)} PDF(s). Run ingest_corpus.py to embed them.")


if __name__ == "__main__":
    convert_pdfs()
