# FitHub Constitution — non-negotiable rules

These rules apply to every line of code in this repo. A rule here means Claude must enforce it
automatically; a violation must block the PR.

## Security (health data + auth)

- **Auth on every data route.** No FastAPI route that reads or writes user data may run without
  a verified JWT. Unauthenticated requests → 401.
- **Scope to the authenticated user.** Every DB query filters by the authenticated `sub`. Other-user
  access → 404 (never 403 — information leak).
- **RLS on every table.** Supabase RLS must be enabled; policies required for SELECT, INSERT,
  UPDATE, DELETE before any table goes to production.
- **service-role key is backend-only.** It must never appear in Next.js client code, in the
  `NEXT_PUBLIC_*` namespace, or in any log.
- **No secrets in code.** All credentials are env vars. `.env*` files are gitignored.
  Secret scanning is on. No exceptions.

## Code quality

- **All FastAPI inputs are Pydantic v2 models.** No raw dicts, no `Any` in model fields.
- **Explicit response models on every route.** Never return a raw DB row or ORM object.
- **No `except: pass` or bare `except`.** Use specific exception types; re-raise or return
  an HTTPException with a meaningful status code.
- **No `any` in TypeScript.** Use proper types or `unknown` + narrowing.
- **Functions < 40 lines.** If longer, extract a helper. No multi-paragraph docstrings.
- **Prefer duplication over a wrong abstraction.** Three similar things before extracting.

## Testing

- **100% unit-test coverage on the deterministic engine** (1RM, training load, sports-science
  formulas). These are the highest-ROI tests in the codebase.
- **Every route has an unauthenticated-rejection test** (expect 401) and a
  **cross-user isolation test** (expect 404).
- **RLS tests (pgTAP) for every table operation** before the table ships.

## Schema & migrations

- **Alembic owns the schema.** Never mutate the DB schema outside of a migration file.
- **One table per migration task.** Each migration is its own PR.
- **kg-canonical in the DB.** Store weights in kg; convert on display.
- **UTC everywhere.** Store datetimes in UTC; convert to user timezone on display only.
