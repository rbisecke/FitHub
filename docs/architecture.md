# Architecture

FitHub is a Turborepo monorepo with two apps and one shared package. This document describes the system at the level you need to navigate and contribute to the codebase — not an exhaustive reference, but a map.

---

## Repo layout

```
FitHub/
├── apps/
│   ├── api/          # FastAPI — Python 3.14, Alembic migrations, psycopg3
│   └── web/          # Next.js 16 App Router, shadcn/ui, Tailwind v4
├── packages/
│   └── shared/       # TypeScript types generated from the FastAPI OpenAPI spec
├── supabase/         # Local dev config, seed data, pgTAP RLS tests
└── .github/          # CI: five jobs covering lint, test, contract drift, security
```

---

## Data flow

```
Browser → Next.js (SSR + client) → FastAPI → Supabase Postgres
```

One rule governs all data: **the frontend calls FastAPI; it never touches the database directly.**

Supabase handles auth (magic-link + Google OAuth). After login the browser holds a JWT signed by Supabase. Every request to FastAPI carries that JWT in the `Authorization: Bearer` header. FastAPI verifies it against the Supabase JWKS endpoint (ES256) before touching any data.

RLS is enforced on every table as a second layer. The FastAPI app-layer scoping and the RLS policies are independent — a bug in application code cannot silently expose another user's data.

---

## `apps/api` — FastAPI

The backend is organized around these top-level packages:

```
apps/api/app/
├── routers/          # HTTP route handlers — thin; delegate to repositories
├── repositories/     # All database queries (psycopg3, raw SQL)
├── models/           # Pydantic request/response models
├── ai/               # LLM integration — coach, parser, plan generator
│   ├── coach.py      # Streaming coach endpoint logic
│   ├── parser.py     # NL workout parser (Instructor + structured output)
│   ├── plan_scaffold.py  # Deterministic plan skeleton (archetype + equipment constraints)
│   ├── plan_generator.py # LLM fill layer (coaching notes, micro-adjustments)
│   ├── prompts.py    # All prompt templates (extracted from routers)
│   ├── retrieval.py  # BM25 + pgvector hybrid RAG
│   └── safety.py     # Safety classifier, red-flag detection
├── engine/           # Deterministic sports-science calculations
│   ├── acwr.py       # ACWR and EWMA load calculations
│   ├── epley.py      # 1RM estimation (Epley formula)
│   └── adaptation.py # Adaptation trigger logic
├── dependencies/     # FastAPI DI: auth extraction, DB connection, common deps
└── migrations/       # Alembic migration scripts
```

**Routers are thin.** They parse the request, call into a repository or engine function, and return the response model. Business logic lives in `repositories/` (data access) and `engine/` (sports science calculations).

**SQL lives in repositories, not routers.** All raw SQL is in `repositories/`. If you're writing a new query, that's where it goes.

---

## `apps/web` — Next.js

```
apps/web/app/
├── (app)/            # Authenticated routes (dashboard, history, coach, etc.)
│   ├── dashboard/
│   ├── history/
│   ├── log/
│   ├── coach/
│   ├── plans/
│   │   ├── [id]/
│   │   │   ├── sessions/[sessionId]/execute/   # live session execution
│   │   │   └── adaptations/
│   │   └── new/                               # plan creation wizard
│   ├── records/
│   ├── analytics/
│   └── profile/
├── (auth)/           # Unauthenticated routes (login, onboarding)
├── admin/            # Admin portal — LLM cost, error events, access requests
└── api/              # Next.js route handlers (thin proxies; most calls go to FastAPI)
```

Key conventions:

- **Server Components by default.** Add `"use client"` only when event handlers or browser hooks are needed.
- **All data fetching goes through FastAPI.** `lib/api/` contains the typed client. Direct Supabase calls are only for auth (via `@supabase/ssr`).
- **`packages/shared` types are auto-generated.** Run `pnpm generate-types` after any FastAPI `response_model` change. The CI contract job fails if the generated types drift from what's committed.

---

## `packages/shared`

TypeScript types generated from the FastAPI OpenAPI spec via `openapi-typescript`. A CI job re-exports the spec and regenerates types on every PR, failing on any drift.

These types are the contract between frontend and backend. If you change a FastAPI response model, you must regenerate and commit the updated types.

---

## `supabase/`

Local dev config for the Supabase CLI (Docker-based). Contains:

- `seed.sql` — invited emails and movement catalog, loaded by `supabase start`
- `seed_progress_demo.sql` — richer demo data for screenshot/demo sessions
- `tests/` — pgTAP tests that verify RLS policies at the database layer

The pgTAP tests are separate from the pytest suite by design. They verify that RLS policies actually block cross-user data access at the database layer, independent of the application code.

---

## Auth flow in detail

1. User clicks "Sign in with Google" or submits a magic-link email on `/login`.
2. Supabase handles the OAuth/magic-link flow and issues a JWT.
3. The browser stores the session in a cookie managed by `@supabase/ssr`.
4. Next.js middleware reads the cookie on every request; unauthenticated requests are redirected to `/login`.
5. Server Components and API route handlers extract the JWT from the cookie and pass it as `Authorization: Bearer` to FastAPI.
6. FastAPI's `get_current_user` dependency fetches the Supabase JWKS, verifies the JWT, and returns the user's UUID.
7. All repository calls receive the user UUID and scope queries accordingly.

The invite-only gate is enforced at two layers. The `before_user_created` Supabase hook checks `invited_emails` before creating any email/magic-link account. For OAuth providers (Google), which bypass that hook, FastAPI's `require_invited` dependency performs the same `invited_emails` check on every authenticated request. A user whose email is not in the table is rejected at sign-up (email) or at first API call (OAuth).

---

## Where things happen (quick reference)

| Thing                         | Where to look                                                       |
| ----------------------------- | ------------------------------------------------------------------- |
| Auth session validation       | `apps/api/app/dependencies/common.py` → `get_current_user`          |
| Workout CRUD                  | `apps/api/app/routers/workouts.py` + `repositories/workouts.py`     |
| Load calculation (ACWR, sRPE) | `apps/api/app/engine/acwr.py`                                       |
| AI coach streaming            | `apps/api/app/ai/coach.py` + `apps/api/app/routers/coach.py`        |
| NL workout parser             | `apps/api/app/ai/parser.py`                                         |
| Adaptive plan generator       | `apps/api/app/ai/planner.py`                                        |
| Injury train-around           | `apps/api/app/engine/injury.py` (deterministic — no LLM)            |
| Safety classifier             | `apps/api/app/ai/safety.py`                                         |
| RLS policy tests              | `supabase/tests/`                                                   |
| OpenAPI → TypeScript types    | `packages/shared/` + `pnpm generate-types`                          |
| Admin portal                  | `apps/web/app/admin/` + `apps/api/app/routers/admin.py`             |
| Plan wizard (5-step)          | `apps/web/app/(app)/plans/new/` + `components/plans/wizard/`        |
| Plan detail (timeline, etc.)  | `apps/web/app/(app)/plans/[id]/` + `components/plans/`              |
| Session execution + set log   | `apps/web/app/(app)/plans/[id]/sessions/[sessionId]/execute/`       |
| Exercise swap sheet           | `apps/web/components/plans/ExerciseSwapSheet.tsx`                   |
| Next session card             | `apps/web/components/dashboard/NextSessionCard.tsx`                 |
| Plan scaffold (deterministic) | `apps/api/app/ai/plan_scaffold.py`                                  |
| Plan AI fill (LLM)            | `apps/api/app/ai/plan_generator.py`                                 |
| Movement substitutes          | `apps/api/app/routers/plans.py` → `GET /movements/{id}/substitutes` |

---

## CI jobs

Five GitHub Actions jobs run on every PR and `main` push:

| Job             | What it checks                                                                    |
| --------------- | --------------------------------------------------------------------------------- |
| **web**         | Typecheck, ESLint, Vitest; path-filtered to `apps/web/**`                         |
| **api**         | Ruff lint/format, mypy (strict), pytest against a real local Supabase             |
| **contract**    | Re-exports the FastAPI OpenAPI spec, regenerates TypeScript types, fails on drift |
| **security**    | pip-audit, npm audit (`--audit-level=high`), git-history secret scan              |
| **commit-lint** | Validates conventional commit format on PRs                                       |

All actions use SHA-pinned versions. Dependabot keeps them current monthly.
