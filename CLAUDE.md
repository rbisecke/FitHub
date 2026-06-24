# FitHub — project context for Claude Code

> **You are resuming this project on a (possibly fresh) machine.** This file is auto-loaded.
> Read it, then read `@claude_docs/planning/PROJECT-CONTEXT.md` (full ported context) and `@claude_docs/HANDOVER.md` (current status + next action).
> Before doing anything, summarize the project, the locked decisions, and the next step, and confirm with the user.

## What FitHub is

"Git for your physical fitness" — a **git-themed, AI-native CrossFit / functional-fitness app**. Personal craft
project (no monetization), also a vehicle to learn RAG/LLM/agents and a portfolio piece. Web-first → PWA → native later.

## Current status

**Design phase complete** across product, backend, frontend, deployment, AI, sports-science, nutrition. **No code
written yet.** Next step is implementation starting at **Phase 0 (harness/scaffold)** per the plan below.

## Where everything lives (read these, in this order)

1. `claude_docs/planning/PROJECT-CONTEXT.md` — concise ported memory: all settled decisions + working style (read first).
2. `claude_docs/FitHub-BuildWithClaudeCode.html` — **the build method** (harness, per-feature loop, quality/security gates, phase sequence). Read before implementing.
3. `claude_docs/FitHub-ImplementationPlan.html` — **phased implementation + local validation plan** (local-first, money-last; the step-by-step with validation per phase).
4. `claude_docs/planning/` — the 8 deep design docs (Brainstorm, Design-Backend/Frontend/AI/Deployment/Deployment-Alternatives, Research-SportsScience/Nutrition) + `claude_docs/planning/claudedocs/` research reports.

The `.html` docs are large self-contained references — open them in a browser, or read specific sections on demand. `PROJECT-CONTEXT.md` is the markdown digest meant to be read into context.

## Locked decisions (do not re-litigate)

- **Stack:** Next.js 16 + shadcn/ui + Tailwind v4 (web) · FastAPI + Python 3.14 (api) · **Supabase** (auth + Postgres + pgvector) · Turborepo monorepo (`apps/web`, `apps/api`, `packages/shared`). Hosting: Railway (api) + Vercel (web) + Supabase. AWS is an optional-later learning path only.
- **Auth/DB = Supabase** (supersedes the custom-auth design in the Backend doc and the RDS plan in the AWS doc). Magic-link + Google OAuth; invite-only via `invited_emails` allowlist + `before user created` hook. FastAPI is the **only API**; frontend uses Supabase **for auth only**; all data goes frontend → FastAPI → Postgres. FastAPI verifies the Supabase JWT via JWKS (ES256). service-role key backend-only.
- **Alembic owns the schema** (Supabase = "just Postgres"). **RLS enforced** on every table + app-layer scoping. **kg-canonical** in DB; store UTC, display local tz. Keep a `Profile` table (id = Supabase `sub`).
- **Multi-user, invite-only** from day one (sharing with friends), each user isolated. **Public** GitHub repo (strict secret hygiene).
- **Build order:** deploy-skeleton-first; AI is layered on a stable base, not the foundation.
- **Backups deferred (accepted risk)** — GATE: add `pg_dump`→object-storage backups before inviting friends.

## How to work here (the harness)

- **Spec → plan → TDD-implement (fresh session) → verify with real evidence → fresh-subagent review (incl. security for auth/data) → atomic commit → update HANDOVER → /clear.**
- Keep tasks single-concern (~80-line PR). Verify locally; CI is the gate. Read security-critical code yourself.
- **Local-first, money-last:** build + validate everything on a local Supabase (CLI/Docker) stack for $0; don't deploy to paid cloud until the final deployment phase. Stub the LLM / use Haiku + a local embedding model during AI dev.
- Per-package `CLAUDE.md` (apps/web, apps/api), hooks, skills, and the MCP set (context7 + Playwright + Supabase) are in `.claude/`.

## UI/UX validation rule (mandatory for frontend rendering changes)

Any change that affects how something is **rendered for a user** must go through this loop before the PR is merged:

1. **Screenshot with Playwright** — capture the changed page/component at real viewport size.
2. **UI/UX critique agent** — send the screenshot(s) to a `frontend-architect` agent with the prompt: _"Act as a senior UI/UX designer. FitHub is a dark, git-themed CrossFit app with monospace typography. Critique this screenshot: visual hierarchy, spacing, readability, mobile responsiveness, contrast, git-theme adherence. Return specific actionable fixes."_
3. **Apply every fix** the agent returns, then re-screenshot to confirm.
4. **Include before+after screenshots** in the PR description as the paper trail.

This applies to: new pages, new components, layout/spacing/colour changes, typography changes.
This does NOT apply to: API-only changes, refactors with identical visual output, copy-only edits.

Full procedure in `claude_docs/phases/phase5/E2E-Testing.md` § Layer 5.

## Git workflow

- **Branch naming:** use conventional prefixes — `feat/`, `fix/`, `chore/`, `refactor/`, `docs/`, `test/`, `hotfix/`. Follow the prefix with a short kebab-case description of the change (e.g. `feat/user-profile-api`, `fix/jwt-expiry-check`).
- **No phase references in branch names.** Branch names describe the change being made, not where it sits in the internal roadmap. Internal planning is in `claude_docs/` — branches are public.
- **One concern per branch.** If you're fixing a bug and adding a feature, that's two branches.
- **CI triggers on all conventional-prefix branches** (`feat/**`, `fix/**`, `chore/**`, `refactor/**`, `docs/**`, `test/**`, `hotfix/**`) and on `main`.

## Working style (the user)

Professional software engineer, no design experience. Research-and-design-first; surface key decisions explicitly
and recommend a default; cheap + simple infra first; keep the git theme woven throughout. Full detail in
`claude_docs/planning/PROJECT-CONTEXT.md`.

## UI/UX Design System

FitHub uses a GitHub dark aesthetic. These values are **NON-NEGOTIABLE** — do not suggest deviations.

### Color palette (CSS custom properties in `globals.css`)

- `--bg: #0d1117` — page background
- `--surface: #161b22` — cards, raised surfaces, code blocks
- `--text: #e6edf3` — primary text
- `--muted: #8b949e` — secondary text, labels, metadata
- `--border: #30363d` — borders, dividers, table lines
- `--accent: #58a6ff` — links, CTAs, active nav state
- `--green: #3fb950` — positive, PR merged, streak active
- `--amber: #d29922` — warnings, moderate load, caution
- `--red: #ff7b72` — errors, danger, overtraining
- `--purple: #bc8cff` — PRs, special achievements, premium
- `--cyan: #39d353` — contribution graph max density

### Typography

- **Data/metrics:** `font-mono` (JetBrains Mono) — ALL numbers, hashes, durations, distances, weights
- **UI text:** `font-sans` (system-ui) — nav, labels, body copy, buttons
- No decorative fonts. No Inter. No Poppins. No rounded-corners-as-personality.

### Spacing (8px base rhythm)

Acceptable values: `4px (1)` · `8px (2)` · `12px (3)` · `16px (4)` · `20px (5)` · `24px (6)` · `32px (8)` · `40px (10)` · `48px (12)`

- Card padding: `p-4` (16px) or `p-6` (24px)
- Section gaps: `gap-6` (24px) or `gap-8` (32px)
- List item gaps: `gap-2` (8px) or `gap-3` (12px)
- Inline gaps (icon + text): `gap-1` (4px) or `gap-2` (8px)

### Navigation

- **Mobile (< 768px):** bottom tab bar + inset FAB (Material Design notch pattern)
- **Desktop (≥ 768px):** shadcn Sidebar, 64px collapsed → 256px expanded
- Single `md:` breakpoint switch — no intermediate states

### Component philosophy

- Dark, professional, dense — developer tool aesthetic, not fitness app pastels
- Monospace for ALL numerical data: no exceptions
- Git-themed copy where natural: "commit", "push", "branch", "repo", "merge"
- No success confetti. Subtle spring animations only. Always respect `prefers-reduced-motion`.
- Touch targets ≥ 44px on mobile. Safe-area insets required on bottom nav.

### Design iteration workflow (when making UI changes)

1. `pnpm -C apps/web dev` — start the dev server first
2. Use Playwright MCP: navigate → resize (375px + 1280px) → screenshot before
3. Apply changes
4. Re-screenshot at same viewports → compare before/after
5. Run the structured critique from `claude_docs/research_claude_design_iteration.md §5`
6. Iterate until the §7 "signs you're done" checklist passes
7. Include before+after screenshots in the PR description

Full iteration guide: `claude_docs/research_claude_design_iteration.md`
Full implementation plan: `claude_docs/planning/frontend-revamp/IMPLEMENTATION-PLAN.md`

## Open (deferrable) choices

First connected wearable source (Oura/Strava/Apple) · domain name · public-vs-private profiles.

## Machine-setup reminders (these did NOT travel in the zip — redo on a new machine)

- Re-add MCP servers (`claude mcp add` context7 / playwright / supabase) — see Build doc §08.
- Recreate any `~/.claude/CLAUDE.md` global rules (e.g., dark-theme HTML output style) if you want them.
- Install Docker, Claude Code, pnpm, uv, Supabase CLI (Implementation Plan §B).
