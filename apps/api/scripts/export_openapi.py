#!/usr/bin/env python3
"""
Dumps FastAPI's OpenAPI schema to apps/api/openapi.json without running the
server. The DB pool is initialised only inside the lifespan async context
manager (called by the ASGI server on startup), so importing app.main is safe.

Run from the repo root:
    uv run --project apps/api python apps/api/scripts/export_openapi.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

# Ensure the apps/api source root is on sys.path so the `app` package
# resolves regardless of the working directory this script is invoked from.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.main import app  # noqa: E402

OUT = Path(__file__).resolve().parent.parent / "openapi.json"
OUT.write_text(json.dumps(app.openapi(), indent=2) + "\n")
print(f"wrote {OUT.relative_to(Path.cwd())}")
