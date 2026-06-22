# Contributing to FitHub

FitHub is a personal project and the primary developer is [@rbisecke](https://github.com/rbisecke). Contributions are welcome, with the caveats below.

## What contributions are welcome

- **Bug reports** — open an issue using the bug report template. Include reproduction steps.
- **Bug fixes** — PRs for confirmed bugs are welcome without prior discussion.
- **Discussion** — open a Discussion for questions, ideas, or feedback. GitHub Issues are for bugs and confirmed feature work only.
- **Major features** — open a Discussion or Issue first. The project has a planned roadmap; unsolicited large-scope PRs may not be merged.

## Development setup

See the [Getting Started](../README.md#getting-started) section of the README for the full local setup guide.

Prerequisites: Docker, Node.js ≥ 20, pnpm ≥ 9, Python 3.14, uv, Supabase CLI.

## Code standards

All non-negotiable engineering decisions are documented in [`CONSTITUTION.md`](../CONSTITUTION.md) at the repo root. Read it before opening a PR.

Key points:

- **Python**: ruff (lint + format), mypy strict. Run `uv run --project apps/api ruff check apps/api` and `uv run --project apps/api mypy apps/api/app`.
- **TypeScript/Next.js**: ESLint + Prettier. Run `pnpm -C apps/web lint` and `pnpm -C apps/web typecheck`.
- **Tests must pass**: `uv run --project apps/api pytest /abs/path/to/apps/api/tests/` (must use absolute path from repo root) and `supabase --workdir . test db`.
- **No LLM API calls in tests**: set `STUB_LLM=true` — the full test suite runs offline.

## Branch naming

Use conventional prefixes followed by a short kebab-case description:

```
feat/user-profile-api
fix/jwt-expiry-check
chore/update-dependencies
refactor/extract-workout-repository
docs/update-architecture-diagram
test/add-rls-coverage
```

No phase references in branch names (`feat/phase-5-coach` is wrong; `feat/ai-coach` is right).

## Commit messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(api): add movement search endpoint
fix(web): correct UTC midnight date offset in contribution graph
chore(deps): bump next from 15.3.1 to 15.3.2
```

The CI commit-lint job enforces this on PRs.

## PR checklist

Before marking a PR ready for review:

- [ ] All tests pass (`pytest`, `pgTAP`, `mypy`, `ruff`, `typecheck`, `lint`)
- [ ] Schema changes have a corresponding Alembic migration and pgTAP RLS tests
- [ ] UI changes include before/after screenshots in the PR description
- [ ] `STUB_LLM=true` is not required for any production code path (only for tests)
- [ ] No secrets, API keys, or local `.env` values committed

## Monorepo structure

```
FitHub/
├── apps/api/          # FastAPI backend
├── apps/web/          # Next.js 16 frontend
├── packages/shared/   # OpenAPI-generated TypeScript types
└── supabase/          # Local dev config + pgTAP RLS tests
```

Changes to `apps/api/` rarely require changes to `apps/web/`, and vice versa. Keep PRs single-concern.
