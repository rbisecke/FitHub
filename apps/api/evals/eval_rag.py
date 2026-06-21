"""Measure Hit@5 against the golden Q&A set.

Usage:
    PYTHONPATH=apps/api uv run --project apps/api python apps/api/evals/eval_rag.py

Run before and after any chunking or model change to confirm improvement.
Hit@5 target after Markdown-aware chunking: >= 90%.
"""

from __future__ import annotations

import asyncio
import json
import os
from pathlib import Path

import psycopg

from app.ai.rag import hybrid_retrieve

GOLDEN_PATH = Path(__file__).parent / "rag_golden_set.json"
DB_DSN = os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@127.0.0.1:54322/postgres")


async def evaluate() -> None:
    golden = json.loads(GOLDEN_PATH.read_text())
    hits = 0
    misses: list[str] = []

    async with await psycopg.AsyncConnection.connect(DB_DSN) as db:
        for item in golden:
            results = await hybrid_retrieve(item["question"], db, top_k=5)
            matched = False
            for r in results:
                title_match = item["expected_title_contains"].lower() in r["title"].lower()
                type_match = r["source_type"] == item["expected_source_type"]
                if title_match and type_match:
                    hits += 1
                    matched = True
                    break
            if not matched:
                misses.append(item["question"])

    total = len(golden)
    print(f"\nHit@5: {hits}/{total} = {hits / total * 100:.1f}%")
    if misses:
        print(f"\nMissed ({len(misses)}):")
        for q in misses:
            print(f"  - {q}")
    else:
        print("\nAll questions matched.")


if __name__ == "__main__":
    asyncio.run(evaluate())
