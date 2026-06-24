# Skill: ui-rehydrate

Rehydrates context at the start of a new UI redesign session. Reads the minimum
set of docs needed for today's work — the handover tracker and the specific design
doc for the target page — then summarises and confirms before proceeding.

CLAUDE.md is already auto-loaded (design system, colour palette, spacing, nav rules).
This skill loads the two additional files needed for the session.

## Usage

```
/ui-rehydrate <page>
```

**`<page>`** — one of: `dashboard`, `history`, `logger`, `progress`, `records`,
`coach`, `profile`, `onboarding`, `navigation`, `library`, `gamification`

## Steps

### 1. Read the handover tracker

Read `claude_docs/planning/frontend-revamp/FRONTEND-REVAMP-HANDOVER.md` in full.

From it, extract:

- Current base branch (`feat/ui-revamp`)
- Which PRs are ✅ Done, 🔄 In Progress, 🔲 Not Started
- The sub-branch name for today's target page (from the Progress Tracker table)
- Any backend blockers that affect today's page

### 2. Read the target design doc

Use this map to find the right file:

| Argument       | Design doc                                                              |
| -------------- | ----------------------------------------------------------------------- |
| `dashboard`    | `claude_docs/planning/frontend-revamp/page-dashboard.md`                |
| `history`      | `claude_docs/planning/frontend-revamp/page-history.md`                  |
| `logger`       | `claude_docs/planning/frontend-revamp/page-logger.md`                   |
| `progress`     | `claude_docs/planning/frontend-revamp/page-progress.md`                 |
| `records`      | `claude_docs/planning/frontend-revamp/page-records.md`                  |
| `coach`        | `claude_docs/planning/frontend-revamp/page-coach.md`                    |
| `profile`      | `claude_docs/planning/frontend-revamp/page-profile-settings.md`         |
| `onboarding`   | `claude_docs/planning/frontend-revamp/cross-onboarding.md`              |
| `navigation`   | `claude_docs/planning/frontend-revamp/cross-navigation-layout.md`       |
| `library`      | `claude_docs/planning/frontend-revamp/cross-library-migration.md`       |
| `gamification` | `claude_docs/planning/frontend-revamp/cross-motivation-gamification.md` |

Read the design doc. Do NOT read any other design docs — they are not needed for
this session and will fill context unnecessarily.

### 3. Check git state

Run:

```bash
git branch --show-current
git log feat/ui-revamp..HEAD --oneline
```

Report whether you are already on the correct sub-branch for today's work,
or still on `feat/ui-revamp` (in which case a new branch needs to be created).

### 4. Output a session brief

Respond with exactly these sections:

---

**Session: `<page>`**

**Branch:** `<current branch>` → working branch should be `feat/ui-<page>`
_(create with: `git checkout -b feat/ui-<page>` if not already on it)_

**Status:** `<what the HANDOVER tracker says for this PR — Not Started / In Progress>`

**Backend blockers:**

- `<list any blockers from the design doc's Accuracy Review or blockers section>`
- _(or "None — this page can be fully built and tested without waiting on backend PRs")_

**What this session will build:**
`<2–3 sentence summary of what the design doc specifies for this page — the core layout change, key components, biggest design decision>`

**Key constraints to keep in mind:**

- `<up to 4 bullets — the most important non-obvious facts from the design doc's Accuracy Review that would trip up implementation>`

**When implementation is done, run:**

```
/ui-iterate <page>
```

---

Does this match what you want to work on today? Confirm and I'll get started,
or correct me if the target or branch is wrong.

### 5. Stop and wait

Do not open any other files, write any code, or run any commands until the user
explicitly confirms.

## What this skill does NOT load

To keep context lean, this skill deliberately does NOT read:

- The other 10 design docs (read only what you need today)
- `FitHub-UIUX-Brainstorm-Redesign.html` (too large; use only if a specific
  decision needs to be traced back to research)
- `IMPLEMENTATION-PLAN.md` (the HANDOVER tracker has the summary you need)
- `research_claude_design_iteration.md` (already embedded in the `ui-iterate` skill)

If you need context from another doc mid-session, read it on demand — don't
pre-load everything at the start.
