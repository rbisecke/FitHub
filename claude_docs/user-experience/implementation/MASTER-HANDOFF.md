# FitHub UX Implementation — Master Handoff

This document is the coordination hub for implementing all user experience features designed in the `claude_docs/user-experience/design/` folder. Read this first. Then read the specific feature handoff doc for whatever is next.

---

## Project Overview

**FitHub** is a git-themed, AI-native CrossFit tracking app. "Git for your physical fitness." It is a personal craft project (invite-only, multi-user) and a portfolio piece. All features in this implementation effort address UX gaps identified in an audit — things that are designed, and in many cases already have backend support, but are not yet exposed in the UI.

### Monorepo structure

```
/Users/rbisecke/FitHub/
├── apps/web/          # Next.js 16 + shadcn/ui + Tailwind v4 (frontend)
├── apps/api/          # FastAPI + Python 3.14 (backend)
├── packages/shared/   # Shared TypeScript types
├── claude_docs/       # All planning and design documentation
└── CLAUDE.md          # Project-level Claude Code rules (read this)
```

### Tech stack

- **Frontend**: Next.js 16, shadcn/ui, Tailwind v4, TypeScript
- **Backend**: FastAPI, Python 3.14, Alembic (migrations), SQLAlchemy
- **Database/Auth**: Supabase (Postgres + pgvector). Frontend uses Supabase for auth only. All data flows through FastAPI.
- **Dev server**: `pnpm -C apps/web dev` (Next.js on localhost:3000)
- **API server**: `uv run uvicorn app.main:app --reload` from `apps/api/` (i.e., `uv run --project /Users/rbisecke/FitHub/apps/api uvicorn app.main:app --reload`)

### Design system tokens (dark mode — use these values in code)

| Token | Value | Use |
|---|---|---|
| `--bg` | `#0d1117` | Page background |
| `--surface` / `--card` | `#161b22` | Cards, raised surfaces |
| `--surface-2` | `#1c2128` | Unread notification rows, elevated overlays |
| `--text` | `#e6edf3` | Primary text |
| `--muted` | `#8b949e` | Metadata, secondary text |
| `--border` | `#30363d` | Borders, dividers |
| `--accent` | `#4ADE80` | Primary CTAs, confirmation, active state |
| `--blue` | `#58a6ff` | Links, computed values, coach UI, info |
| `--gold` | `#FFC83D` | PR hero numbers, records, `$ git tag` |
| `--amber` | `#d29922` | Warnings, load percentages, active filters |
| `--red` | `#ff7b72` | Errors, blocked movements, destructive |
| `--green` | `#3fb950` | Success, resolved, streaks |
| `--hot` | `#FF7A45` | Streak fire icon, overtraining |
| `--purple` | **see Phase 0** | After Phase 0: `#8b5cf6` for permanent injury, coach role, modification labels |

Fonts: `font-sans` (Geist Sans — UI text), `font-mono` (Geist Mono — all numbers/hashes), `font-heading` (Archivo Black — page heroes), `font-data` (JetBrains Mono — dense analytics tables only).

---

## Implementation Order

Features are implemented **sequentially** — start the next only after the current is fully merged into `main`.

| # | Feature | Status | Handoff Doc |
|---|---|---|---|
| 0 | Prerequisites — globals.css token fixes | `done` | `phase-0-prerequisites/HANDOFF.md` |
| 1 | PR Entry & Records discoverability | `done` | `feature-1-pr-entry/HANDOFF.md` |
| 2 | Strength Intelligence — 1RM prediction & calculator | `done` | `feature-2-strength-intelligence/HANDOFF.md` |
| 3 | Injury System — taxonomy, nav, and modification flows | `done` (PR #206, 2026-07-04) | `feature-3-injury-system/HANDOFF.md` |
| 4 | Cardio Equipment Conversion | `done` | `feature-4-cardio-conversion/HANDOFF.md` |
| 5 | Wearable & Recovery | `done` (PRs #211–#215, 2026-07-04) | `feature-5-wearable-recovery/HANDOFF.md` |
| 6 | Social & Team Sessions | `done` (PRs #217–#221, 2026-07-04) | `feature-6-social-team/HANDOFF.md` |
| 7 | Polish & Completeness | `done` | `feature-7-polish/HANDOFF.md` |

**Update the Status column** in this table as each feature completes. Valid values: `not started`, `in progress`, `blocked: [reason]`, `done`.

---

## Mockup Prototype Files

All Claude Design prototype files live at:
```
claude_docs/user-experience/design/prototypes/
```

**Prototype iteration**: Files were last updated 2026-07-04. All known prototype bugs have been fixed and verified. See AUDIT-REPORT.md §Functional Gaps for details.

The `DESIGN-INDEX.md` file maps each prototype to its feature and documents all interactive states, transitions, and design decisions.

---

## Branching and CI Rules

These rules apply to every feature agent.

```
main
 └── feat/ux-[feature-name]               ← base branch (off main)
      ├── feat/ux-[feature-name]-step-1-[desc]   ← step branch (off base)
      ├── feat/ux-[feature-name]-step-2-[desc]   ← step branch (off base)
      └── feat/ux-[feature-name]-step-N-[desc]   ← step branch (off base)
```

**Branch naming**: Step branches use a flat name with a dash separator (NOT a slash). Git cannot create `feat/ux-foo/step-1` when `feat/ux-foo` already exists as a branch — they share a filesystem path prefix and git rejects it. Use dashes: `feat/ux-foo-step-1-desc`.

1. Create the base branch off `main` at the start of each feature.
2. Each implementation step lives on its own branch off the base branch.
3. Each step branch → PR → CI must pass → merge into the base branch.
4. When all steps are done, create a final PR from the base branch into `main`.
5. Never commit directly to `main` or to the base branch.
6. Steps must be implemented in order — do not start step N+1 until step N is merged into the base branch.
7. Branch names use `feat/`, `fix/`, `chore/`, `refactor/` prefixes + kebab-case description.
8. Commit messages use conventional commit format. No AI attribution in commits.

---

## Validation Protocol (required for every PR)

### Before starting any implementation step

1. **Start both servers** (keep running throughout):
   - Web: `pnpm -C apps/web dev` — confirm it compiles with no errors on localhost:3000
   - API: `uv run --project /Users/rbisecke/FitHub/apps/api uvicorn app.main:app --reload` — confirm it starts on localhost:8000
2. **Verify the base branch is up to date**: `git log --oneline origin/main..HEAD | head -5` — previous feature's commits must be present.

### After each implementation step (before opening the PR)

3. **Type regeneration** (required after any API route or `response_model` change): Run `pnpm -C apps/web generate-types` and commit the updated `apps/web/lib/api/generated.ts` alongside the API change. Skipping this causes TypeScript errors in the frontend.

4. **Frontend checks** — all must pass with zero errors:
   - `pnpm -C apps/web typecheck` — TypeScript
   - `pnpm -C apps/web lint` — ESLint
   - `pnpm -C apps/web test` — Vitest unit tests
   - Every PR requires at least one meaningful new test for the changed code.

5. **Backend checks** (for any step touching `apps/api/`):
   - `uv run --project /Users/rbisecke/FitHub/apps/api ruff check .` — lint
   - `uv run --project /Users/rbisecke/FitHub/apps/api mypy .` — type check
   - `uv run pytest /Users/rbisecke/FitHub/apps/api/tests/` — all tests pass
   - Engine code must have 100% coverage; every new route needs an unauthenticated-rejection test.

6. **Screenshot mobile** (375px): Use Playwright MCP:
   - `browser_navigate` to `http://localhost:3000/[affected-page]`
   - `browser_resize` to width 375
   - `browser_take_screenshot` with `filename: "/Users/rbisecke/FitHub/claude_docs/user-experience/implementation/[feature-folder]/screenshots/[step-name]/mobile.png"` — use the **absolute path** so the file is saved to disk. Create the directory first with `mkdir -p` if it does not exist.

7. **Screenshot desktop** (1280px): Same sequence with width 1280. Save to `...screenshots/[step-name]/desktop.png` (absolute path).

8. **Compare against prototype**: Use Playwright MCP to open the relevant `.dc.html` prototype: navigate to `file:///Users/rbisecke/FitHub/claude_docs/user-experience/design/prototypes/[FileName].dc.html`, screenshot at the same viewports. Compare: colors match design tokens, layout matches, all interactive states are present, fonts are correct (monospace for numbers, sans for labels).

9. **UI/UX critique** (required for any step that changes rendered output):
   - Read the saved desktop screenshot file and send it to a `frontend-architect` agent with this prompt: _"Act as a senior UI/UX designer. FitHub is a dark, git-themed CrossFit app with monospace typography. Critique this screenshot: visual hierarchy, spacing, readability, mobile responsiveness, contrast, git-theme adherence. Return specific actionable fixes."_
   - Apply every fix the agent returns, then re-screenshot to confirm and overwrite the saved file.

10. **E2E test** (for any step touching API or backend logic): With both servers running, exercise the full flow through the browser via Playwright MCP. Verify data persists, API calls succeed, and no network errors appear.

11. **`prefers-reduced-motion`**: For any step that adds animations or transitions, verify the implementation wraps all animation in a `prefers-reduced-motion: reduce` media query or uses a motion-safe utility class.

---

## How to Use This Document as a Coordinating Agent

When you wake up in this session as the coordinating agent:

1. Read this file to understand the overall state.
2. Find the first row in the Implementation Order table with status `not started` or `in progress`.
3. Read that feature's `HANDOFF.md`. Check each step's checkbox state to determine what is already done.
4. Spawn a **fresh** (non-fork) sub-agent to implement that feature:
   ```
   Agent({
     description: "Implement Feature N — [name]",
     prompt: "You are implementing Feature N of FitHub. Before writing any code, read these three files in order:\n\n1. /Users/rbisecke/FitHub/claude_docs/user-experience/implementation/feature-N-[name]/HANDOFF.md — your complete feature spec\n2. /Users/rbisecke/FitHub/claude_docs/user-experience/implementation/MASTER-HANDOFF.md — §Validation Protocol (all steps required for every PR)\n3. /Users/rbisecke/FitHub/claude_docs/user-experience/implementation/CODEBASE-MAP.md — where files live, exact commands, common mistakes\n\nImplement everything in the HANDOFF.md. After finishing each implementation step, check off its acceptance criteria in the HANDOFF.md. After finishing the feature, update the Status field at the top of the HANDOFF.md to 'done'.\n\nDo NOT summarise your understanding and ask for confirmation before starting. Read the docs and begin implementing immediately."
   })
   ```
   **Do NOT use `subagent_type: "fork"`.** Forks inherit the full coordinator context and will exhaust the context window by Feature 3. Each feature agent must start fresh.

5. When the sub-agent completes, update the Status column in this file and confirm the feature's HANDOFF.md top-level Status field reads `done`.
6. Move to the next feature.

### Resumption protocol

If a feature agent was interrupted mid-feature (e.g., context limit hit, session ended), its HANDOFF.md checkboxes show exactly which steps are done. To resume:
- Spawn a new fresh agent with the same prompt as above.
- The new agent reads the HANDOFF.md, sees which checkboxes are checked, and continues from the first unchecked step.
- No re-implementation of completed steps.

### Context budget per feature

Features with 6+ steps (Feature 1 has 7, Feature 3 has 6) may exhaust a single agent's context before finishing. If you notice the feature agent's context is running long, spawn a fresh continuation agent with this prompt: _"You are continuing the implementation of Feature N in FitHub. Read the HANDOFF.md to see which steps are checked off, then implement the remaining unchecked steps."_ The HANDOFF.md checkpoint state carries across agents cleanly.

### Decision protocol

Feature agents will sometimes hit an ambiguity not covered in the handoff. The protocol:
1. **Use best judgment** for anything the design doc or prototype makes clear once you read them.
2. **Document the decision** in a comment near the code with format: `// Design decision: [what you chose and why]`.
3. **Do not pause** for clarification on minor questions — make the call and document it.
4. **Stop and note the blocker** in the HANDOFF.md (add a `> **Blocker**: ...` line under the failing step) only when an ambiguity would require a fundamentally different architectural direction. Leave the step unchecked and move to the next step if possible.

---

## Key Reference Docs

- `CLAUDE.md` (project root) — project rules, locked architectural decisions, working style
- `claude_docs/user-experience/implementation/CODEBASE-MAP.md` — where files live, exact commands, common mistakes, feature-to-file quick reference. **Read this before implementing.**
- `claude_docs/user-experience/design/AUDIT-REPORT.md` — prototype audit: what's correct, implementation flags, follow-up prompts
- `claude_docs/user-experience/design/DESIGN-INDEX.md` — prototype file map with states and transitions
- `claude_docs/user-experience/design/MOCKUP-PROMPTS.md` — original design prompts for each cluster
- Individual design docs in `claude_docs/user-experience/design/` — full problem context and requirements per feature
