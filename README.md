# FitHub

**git for your physical fitness**

[![CI](https://github.com/rbisecke/FitHub/actions/workflows/ci.yml/badge.svg)](https://github.com/rbisecke/FitHub/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![Python 3.14](https://img.shields.io/badge/python-3.14-blue?style=flat-square&logo=python&logoColor=white)](https://www.python.org/downloads/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Ruff](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/astral-sh/ruff/main/assets/badge/v2.json)](https://github.com/astral-sh/ruff)

![FitHub Today](screenshots/readme/today.png)

FitHub is a training tracker built on a git mental model: every workout is a commit with a short hash ID, the history page is `git log --all`, and every page has a `$ git command` subtitle above its Archivo Black heading. Under the surface it applies the sports-science models that most fitness apps skip — sRPE-based load, ACWR, and Hooper readiness — plus a deterministic AI layer that generates plans and coaching prose without ever being the source of safety decisions.

The app is invite-only and in active development. Use the "Request access" form on the login page to submit an invite request, or [run it locally](#getting-started).

---

## What it does

| Theme                     | Details                                                                                                                                                                                                                                                                                         |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Track**                 | `git commit -m` — NL input box parses free-text workout descriptions into structured sets; staged-changes panel for review before committing; RPE stepper                                                                                                                                       |
| **Training log**          | `git log --all` — short hash IDs, PR badges, benchmark / partner / AMRAP / EMOM / strength WOD support; tap any commit to expand full detail                                                                                                                                                    |
| **Load management**       | sRPE × duration perceived load; ACWR via EWMA; ATL/CTL/TSB; Hooper index check-ins; training balance breakdown by muscle group                                                                                                                                                                  |
| **Personal records**      | `git tag --list` — gold hero numbers at 42px, category pills, timeline rail; named-benchmark progress (e.g. Fran 4:47 → 3:48)                                                                                                                                                                   |
| **AI coach & planning**   | SSE streaming chat with session history; hybrid RAG (BM25 + pgvector RRF fusion); adaptive plan generator with deterministic ACWR/readiness triggers; injury train-around; 5-step plan wizard (archetype, equipment, schedule, target movement, training age) with scaffold-first AI generation |
| **Session execution**     | Live exercise logging during planned sessions — per-set reps and weight inputs, rest timer, AI-suggested exercise swaps from a curated substitutes catalog                                                                                                                                      |
| **Admin & observability** | LLM cost dashboard; per-user token and cost breakdown by model/endpoint; error event log; API health metrics; access-request queue with approve/reject workflow (requests submitted from the login page)                                                                                        |
| **Data model depth**      | Poliquin 4-digit tempo notation; Epley e1RM cached at write time; VBT fields; wearable-ready schema; IDOR-safe team session consent model                                                                                                                                                       |
| **Engineering**           | Invite-only multi-user from day one; deterministic safety logic; 1,467 tests across four suites; openapi-typescript contract check in CI                                                                                                                                                        |

---

## Screenshots

<p align="center"><em>1280 × 900 · dark git-developer aesthetic · Archivo Black headings · JetBrains Mono data</em></p>

<p align="center"><em>Want to see every page? Run <code>apps/web/e2e/take-redesign-screenshots.ts</code> to generate a full local gallery at <code>screenshots/full/index.html</code> (gitignored — not shipped in the repo, desktop + mobile for every route).</em></p>

<table>
  <tr>
    <td><img src="screenshots/readme/today.png" alt="Today"></td>
    <td><img src="screenshots/readme/log-history.png" alt="Log history"></td>
  </tr>
  <tr>
    <td align="center"><sub><strong>Today</strong> &mdash; streak, readiness, today's session</sub></td>
    <td align="center"><sub><strong>Log</strong> &mdash; <code>git log</code></sub></td>
  </tr>
  <tr>
    <td><img src="screenshots/readme/plan-wizard.png" alt="Plan wizard"></td>
    <td><img src="screenshots/readme/plan-detail.png" alt="Plan detail"></td>
  </tr>
  <tr>
    <td align="center"><sub><strong>Plan Wizard</strong> &mdash; <code>git checkout -b plan/new</code></sub></td>
    <td align="center"><sub><strong>Plan Detail</strong> &mdash; phases, session list</sub></td>
  </tr>
  <tr>
    <td><img src="screenshots/readme/plan-adaptations.png" alt="Plan adaptations"></td>
    <td><img src="screenshots/readme/progress-load.png" alt="Load / ACWR"></td>
  </tr>
  <tr>
    <td align="center"><sub><strong>Adaptations</strong> &mdash; <code>git diff --plan</code>, merge/adjust/reject</sub></td>
    <td align="center"><sub><strong>Load</strong> &mdash; ACWR, CTL / ATL / TSB</sub></td>
  </tr>
  <tr>
    <td><img src="screenshots/readme/progress-records.png" alt="Personal records"></td>
    <td><img src="screenshots/readme/progress-streak.png" alt="Streak"></td>
  </tr>
  <tr>
    <td align="center"><sub><strong>Records</strong> &mdash; all-time bests</sub></td>
    <td align="center"><sub><strong>Streak</strong> &mdash; <code>git log --graph --all</code></sub></td>
  </tr>
  <tr>
    <td><img src="screenshots/readme/movement-detail.png" alt="Movement detail"></td>
    <td><img src="screenshots/readme/coach-chat.png" alt="AI coach"></td>
  </tr>
  <tr>
    <td align="center"><sub><strong>Movement Detail</strong> &mdash; per-lift history</sub></td>
    <td align="center"><sub><strong>AI Coach</strong> &mdash; chat with session history</sub></td>
  </tr>
  <tr>
    <td><img src="screenshots/readme/injuries.png" alt="Injuries"></td>
    <td><img src="screenshots/readme/team-session.png" alt="Team session"></td>
  </tr>
  <tr>
    <td align="center"><sub><strong>Injuries</strong> &mdash; train-around engine</sub></td>
    <td align="center"><sub><strong>Team Session</strong> &mdash; shared partner WOD</sub></td>
  </tr>
  <tr>
    <td><img src="screenshots/readme/admin-users.png" alt="Admin users"></td>
    <td><img src="screenshots/readme/admin-cost.png" alt="Admin cost dashboard"></td>
  </tr>
  <tr>
    <td align="center"><sub><strong>Admin</strong> &mdash; user management</sub></td>
    <td align="center"><sub><strong>Admin</strong> &mdash; LLM cost dashboard</sub></td>
  </tr>
  <tr>
    <td><img src="screenshots/readme/onboarding.png" alt="Onboarding"></td>
    <td><img src="screenshots/readme/login.png" alt="Login"></td>
  </tr>
  <tr>
    <td align="center"><sub><strong>Onboarding</strong></sub></td>
    <td align="center"><sub><strong>Login</strong> &mdash; magic-link + OAuth</sub></td>
  </tr>
</table>

---

## Architecture

```
FitHub/
├── apps/
│   ├── api/          # FastAPI — Python 3.14, Alembic migrations, psycopg3
│   └── web/          # Next.js 16 App Router, shadcn/ui, Tailwind v4
├── packages/
│   └── shared/       # TypeScript types generated from the FastAPI OpenAPI spec
├── supabase/         # Local dev config, seed data, pgTAP RLS tests
└── .github/          # CI: api, web, contract drift, security audit
```

**Data flow:**

```
Browser → Next.js → FastAPI (ES256 JWT via JWKS) → Supabase Postgres
```

The frontend calls FastAPI exclusively. Supabase handles auth (magic-link + Google OAuth); FastAPI verifies the JWT against the Supabase JWKS endpoint. The frontend never touches the database directly. RLS is enforced on every table as a second layer independent of the application.

`packages/shared` contains TypeScript types generated from the FastAPI OpenAPI schema via `openapi-typescript`. A CI job re-exports the spec and regenerates types on every PR, failing on any drift between the API contract and the frontend type definitions.

| Layer    | Technology                                                                       |
| -------- | -------------------------------------------------------------------------------- |
| Frontend | Next.js 16 App Router, shadcn/ui, Tailwind v4, Recharts                          |
| Backend  | FastAPI, Pydantic v2, Alembic, psycopg3                                          |
| Database | Supabase Postgres + pgvector, RLS on every table                                 |
| Auth     | Supabase magic-link + Google OAuth, ES256 JWT via JWKS                           |
| AI       | Claude Haiku 4.5 via Instructor, SSE streaming, hybrid RAG (BM25 + pgvector RRF) |
| Testing  | pytest (732), pgTAP RLS (52), Playwright E2E (151), Vitest unit (532)            |
| CI       | GitHub Actions: lint, typecheck, test, contract drift, security audit            |
| Hosting  | Railway (API) · Vercel (web) · Supabase (DB / auth)                              |

---

## AI architecture

The core principle: **safety-critical logic is deterministic Python; the LLM generates prose and plans only.** The AI never decides whether a load level is safe or whether to adapt a program — deterministic rules make those decisions, and the LLM explains the result.

### Components

**NL log parser** — parses free-text workout descriptions into structured Pydantic models using [Instructor](https://github.com/instructor-ai/instructor) with Anthropic tool-use constrained decoding. Schema adherence is ~99% with Instructor vs ~85% with raw JSON mode; the structured output is validated by Pydantic before write.

**Streaming coach** — SSE endpoint with persistent session history. Retrieval combines BM25 keyword search and pgvector cosine similarity with Reciprocal Rank Fusion. Sources include CrossFit Level 1 programming standards, coaching notes, and session history. Context is XML-delimited before injection to mitigate prompt injection.

**Adaptive plan generator** — returns HTTP 202 immediately and exposes a polling URL (async task pattern). Uses a scaffold-first approach: a deterministic layer builds the full session/movement/set skeleton based on archetype constraints and equipment availability, then the LLM fills in coaching notes and micro-adjustments. Inputs are structured: archetype, equipment preset, target movement (with Epley 1RM or prerequisite ladder), training age, program duration, and current ACWR/Hooper readiness score. Output is validated against the sports-science knowledge base before persisting. Archetype-specific prompts route to different instruction sets; model selection adapts to archetype complexity.

**Adaptation engine** — deterministic triggers fire when ACWR >1.5, readiness <0.4, consecutive missed sessions, or RPE drift exceeds threshold. When a trigger fires, it is passed to the LLM with full context to generate a rationale. The LLM does not decide _whether_ to adapt.

**Injury train-around engine** — fully deterministic, no LLM. 21 body regions (9 joint, 8 muscle belly, 3 soft-tissue/connective: `hamstring`, `quad`, `calf`, `glute`, `upper_back`, `chest`, `bicep`, `tricep`, `lat`, `hip_flexor`, `it_band`, `forearm`). Curated `CONTRAINDICATIONS` and `SUBSTITUTES` dicts map region → blocked movements → swap options. `CHRONIC_REGIONS` suppress acute-rupture red-flag language for overuse conditions. `POST /coach/modify-workout` cross-references the athlete's active injuries against every planned movement and returns blocked movements, the regions driving each block (`driven_by`), and curated substitutions — no LLM, no heuristics. Injury context (contraindicated movements, MEDICAL ALERT for referral injuries, today's prescribed session) is injected into the coach system prompt at every chat turn.

**Safety classifier** — evaluated on a 60-case golden set with 100% STOP accuracy on dangerous requests. Injury red-flag detection is rule-based Python, not LLM.

### Model strategy

| Environment | Model                                                             | Cost                    |
| ----------- | ----------------------------------------------------------------- | ----------------------- |
| Dev / CI    | `STUB_LLM=true` (deterministic fixture responses, zero API calls) | $0                      |
| Production  | Claude Haiku 4.5                                                  | $1 / $5 per MTok in/out |

---

## Getting started

### Prerequisites

- **Node.js ≥ 20** and **pnpm ≥ 9** — `npm install -g pnpm`
- **Python 3.14** and **uv** — `curl -LsSf https://astral.sh/uv/install.sh | sh`
- **Docker** — required for local Supabase
- **Supabase CLI** — `brew install supabase/tap/supabase` or [see the docs](https://supabase.com/docs/guides/cli/getting-started)

### Setup

Start local Supabase first — everything else depends on it:

```bash
supabase start
```

Then clone, install, and configure:

```bash
git clone https://github.com/rbisecke/FitHub.git
cd FitHub

pnpm install
uv sync --project apps/api

cp .env.example .env
# Fill in values from `supabase status`:
#   API URL → NEXT_PUBLIC_SUPABASE_URL
#   anon key → NEXT_PUBLIC_SUPABASE_ANON_KEY
#   service_role key → SUPABASE_SERVICE_ROLE_KEY
#   DB URL → DATABASE_URL  (use 127.0.0.1, not localhost — see gotchas)
```

Apply migrations and start the apps:

```bash
# Apply database migrations
uv run --project apps/api alembic -c apps/api/alembic.ini upgrade head

# Terminal 1 — API (LLM stubbed; no API key required)
STUB_LLM=true uv run --project apps/api uvicorn app.main:app --app-dir apps/api --port 8000

# Terminal 2 — Web
pnpm --filter web dev
```

Open [http://localhost:3000](http://localhost:3000). The app is invite-only; add your email to the `invited_emails` table via the local Supabase Studio at [http://localhost:54323](http://localhost:54323) to log in.

### Known gotchas

**Use `127.0.0.1`, not `localhost`** — on macOS, `localhost` resolves to `::1` (IPv6) and the psycopg3 connection will fail. The `DATABASE_URL` in `.env` must use `127.0.0.1:54322`.

**pytest requires an absolute test path** — `uv run --project apps/api pytest apps/api/tests` may fail depending on your working directory. Use `$(pwd)/apps/api/tests/` to be safe.

**`STUB_LLM=true` is mandatory for the test suite** — with it set, all LLM calls return deterministic fixture responses and no API key is required. Without it the AI tests will attempt real API calls and fail or accumulate cost.

**Admin portal requires an API env var** — the `/admin` routes are gated by `ADMIN_USER_IDS_CSV` (comma-separated UUIDs) in the FastAPI process environment; the Next.js admin layout re-verifies server-side by calling `GET /api/v1/admin/is-admin` rather than reading an env var of its own. Your Supabase user ID can be found in the local Supabase Studio at `http://localhost:54323` under the Users table.

---

## Testing

FitHub has four test suites and passes strict static analysis. pgTAP is worth highlighting — most web applications rely solely on application-layer authorization checks; the 52 pgTAP tests verify that RLS policies prevent cross-user data access at the database layer, independent of the application code.

| Suite              | Tool        | Count | Covers                                                                     |
| ------------------ | ----------- | ----- | -------------------------------------------------------------------------- |
| Unit + integration | pytest      | 732   | API routes, repositories, AI stubs, rate limiting, auth, admin portal      |
| DB isolation       | pgTAP       | 52    | RLS policies on every table, cross-user data isolation                     |
| Browser E2E        | Playwright  | 151   | Auth flow, workout CRUD, coach chat, plan generation, login page, admin UI |
| Unit (frontend)    | Vitest      | 532   | Utility functions, hooks, API client, component logic                      |
| Static analysis    | mypy + ruff | —     | Strict mypy, zero `Any` in models, ruff format                             |

```bash
# Unit + integration
STUB_LLM=true uv run --project apps/api pytest $(pwd)/apps/api/tests/ -v

# RLS isolation (requires local Supabase running)
supabase --workdir . test db

# E2E (requires API running on port 8000 with STUB_LLM=true)
pnpm --filter web exec playwright test

# Frontend unit
pnpm --filter web test
```

---

## CI

GitHub Actions runs on every push to `main` and on every PR. Five jobs, all with SHA-pinned actions:

- **Web** — typecheck, ESLint, Vitest; path-filtered to `apps/web/**`
- **API** — ruff lint/format, mypy, pytest against a real local Supabase instance; path-filtered to `apps/api/**`
- **Contract** — re-exports the FastAPI OpenAPI spec and regenerates TypeScript types; fails if either file drifts from what is committed
- **Security** — pip-audit, npm audit (`--audit-level=high`), and a git-history secret scan; runs unconditionally on every push
- **Commit lint** — validates conventional commit format on PRs (informational; not a required merge check)

Dependabot keeps Actions SHAs current monthly and pip/npm dependencies weekly.

---

## Status & roadmap

The design system revamp shipped in full — 13 scopes across every page and route, Archivo Black headings, JetBrains Mono data font, and green accent throughout. The injury-aware coach feature shipped: 21 body regions, 3-state status lifecycle, deterministic `modify-workout` endpoint. The admin portal is live with LLM cost tracking, error event log, and API health dashboard. The login page was redesigned with an in-page "Request access" form. **Programming Flexibility** shipped: 5-step plan creation wizard, scaffold-first AI plan generator with 7 archetypes, plan detail page (mesocycle progress, timeline rail, weekly volume sparklines, session list), live session execution with per-set logging and rest timer, and AI-suggested exercise swap. Deployment to Railway + Vercel + Supabase production is the current milestone.

Near-term:

- **Wearable data sync** — schema is wearable-ready; Oura / Apple Health pipeline not yet wired
- **Nutrition tracking** — schema and feature design complete; deferred post-deployment
- **Mobile PWA** — manifest and offline strategy planned; not yet implemented
- **Training balance** — muscle-group categories on movements; balance widget ready once movements are tagged

**Access:** Use the "Request access" form on the login page to submit an invite request, or clone and [run locally](#getting-started).

---

## Contributor documentation

The [`docs/`](docs/) directory contains deeper documentation for contributors:

| Document                                     | What it covers                                                                         |
| -------------------------------------------- | -------------------------------------------------------------------------------------- |
| [docs/architecture.md](docs/architecture.md) | System map: monorepo layout, data flow, module boundaries, where things live           |
| [docs/science.md](docs/science.md)           | Sports science methodology — sRPE, ACWR/EWMA, Hooper Index, ATL/CTL/TSB with citations |
| [docs/ai.md](docs/ai.md)                     | LLM architecture — deterministic vs. generated decisions, RAG pipeline, safety design  |

Start with `architecture.md` if you're new to the codebase. Read `science.md` before touching any load or readiness calculation. Read `ai.md` before touching the AI layer.

---

## Contributing

Bug reports and PRs welcome. For significant feature changes, open an issue first.

Engineering standards that are not negotiable are in [`CONSTITUTION.md`](CONSTITUTION.md). Security vulnerabilities should be reported privately via the GitHub [Security tab](https://github.com/rbisecke/FitHub/security/advisories/new) — see [`.github/SECURITY.md`](.github/SECURITY.md) for scope and process.

MIT License — see [LICENSE](LICENSE).
