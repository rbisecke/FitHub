# apps/api — FastAPI backend

## Stack
FastAPI · Python 3.12 · uv · Pydantic v2 · Alembic (Phase 2+) · pytest + httpx · Ruff · mypy strict

## Commands
```bash
uv run uvicorn app.main:app --reload   # dev server (localhost:8000)
uv run pytest                          # all tests
uv run pytest --cov=app --cov-report=term-missing  # with coverage
uv run ruff check .                    # lint
uv run ruff format .                   # format
uv run mypy .                          # type check
```

## Key conventions
- **FastAPI is the only API** — no direct Supabase calls from the frontend for data.
- All route inputs are Pydantic v2 models — no raw dicts, no `Any`.
- All routes have explicit response models — never expose raw DB rows.
- Every data route requires auth — verify Supabase JWT via JWKS (ES256) on every request.
- No `except: pass` — use specific exception types; let FastAPI's exception handler log/format.
- Functions < 40 lines; prefer duplication over a wrong abstraction.
- No hardcoded secrets — env vars only, loaded via `python-dotenv` in dev.

## Auth pattern (Phase 1+)
- Verify Supabase JWT with `python-jose` + JWKS endpoint.
- Validate `iss` (project URL) and `aud == "authenticated"`.
- Extract `sub` as the user ID; scope all DB queries to that ID.
- Service-role key backend-only — never return it, never log it.

## Testing
- Integration tests against the real local Supabase DB (no mocks for DB layer).
- Every route needs an unauthenticated-rejection test.
- Other-user request → 404, not 403 (prevent IDOR).
- Coverage target: 80% minimum; engine code: 100%.
