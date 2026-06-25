# Skill: ui-rehydrate

Rehydrates context at the start of a new UI redesign session. Reads the minimum
set of docs needed for today's work — the handover tracker and the specific design
doc for the target page — then summarises and confirms before proceeding.

CLAUDE.md is already auto-loaded (design system, colour palette, spacing, nav rules).
This skill loads the two additional files needed for the session.

## Usage

```
/ui-rehydrate           ← auto-selects next unblocked PR from the handover tracker
/ui-rehydrate <page>    ← override: jump to a specific page
```

**`<page>`** (optional override) — one of: `dashboard`, `history`, `logger`,
`progress`, `records`, `coach`, `profile`, `onboarding`, `navigation`, `library`,
`gamification`, `tag`

## Steps

### 1. Read the handover tracker

Read `claude_docs/planning/frontend-revamp/FRONTEND-REVAMP-HANDOVER.md` in full.

From it, extract:

- Which PRs are ✅ Done, 🔄 In Progress, 🔲 Not Started (Progress Tracker table)
- The dependency graph (Implementation Sequence tables — "Depends on" column)
- Any backend PRs (B1–B7) that are blocking frontend work

### 2. Determine the target page

**If the user passed a `<page>` argument:** use it directly — skip the auto-select
logic and go to Step 3.

**If no argument was given:** auto-select using this logic:

1. Start with the ordered frontend PR list from the handover: F1, F2, F3, F4, F5,
   F6, F7, F8, F9, F10, F11, F12, F13.
2. Skip any PR marked ✅ Done.
3. For each remaining PR, check its "Depends on" column:
   - If all dependencies are ✅ Done → this PR is **unblocked**
   - If any dependency is 🔲 Not Started or 🔄 In Progress → this PR is **blocked**
4. Select the **first unblocked PR** in the list. That is the target for this session.
5. If everything is blocked (all unblocked PRs have outstanding backend dependencies),
   select the first unblocked **backend PR** (B1–B7) instead and note that backend
   work is needed before frontend can continue.
6. If everything is ✅ Done, report that the revamp is complete and stop.

Map the selected PR to a `<page>` argument using this table:

| PR  | Maps to argument                         |
| --- | ---------------------------------------- |
| F1  | `setup` (no design doc — see note below) |
| F2  | `navigation`                             |
| F3  | `dashboard`                              |
| F4  | `library`                                |
| F5  | `history`                                |
| F6  | `logger`                                 |
| F7  | `progress`                               |
| F8  | `records`                                |
| F9  | `coach`                                  |
| F10 | `onboarding`                             |
| F11 | `profile`                                |
| F12 | `gamification`                           |
| F13 | `tag`                                    |

> **F1 special case:** F1 is the setup PR (install shadcn components, motion, sonner,
> viewport fix, CSS vars). There is no page-level design doc for it. If F1 is the
> selected target, skip Step 3 (no doc to load) and output the session brief with
> a summary drawn from the "Packages to Install in F1" section of the HANDOVER doc.

### 3. Read the target design doc

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
| `tag`          | `claude_docs/planning/frontend-revamp/page-tag.md`                      |

Read the design doc. Do NOT read any other design docs — they are not needed for
this session and will fill context unnecessarily.

### 4. Check git state

Run:

```bash
git branch --show-current
git log feat/ui-revamp..HEAD --oneline
```

Report whether you are already on the correct sub-branch for today's work,
or still on `feat/ui-revamp` (in which case a new branch needs to be created).

### 5. Output a session brief

Respond with exactly these sections:

---

**Session: `<page>`** _(auto-selected: next unblocked PR is `<PR label>`)_
or
**Session: `<page>`** _(override: user requested this page)_

**Branch:** `<current branch>` → working branch should be `feat/ui-<page>`
_(create with: `git -C /Users/rbisecke/FitHub checkout -b feat/ui-<page>` if not already on it)_

**Status:** `<what the HANDOVER tracker says — Not Started / In Progress>`

**Backend blockers:**

- `<list any blockers from the design doc's Accuracy Review or blockers section>`
- _(or "None — this page can be fully built and tested now")_

**What this session will build:**
`<2–3 sentence summary of the core layout change, key components, biggest design decision>`

**Key constraints to keep in mind:**

- `<up to 4 bullets — the most important non-obvious facts from the Accuracy Review that would trip up implementation>`

**When implementation is done, run:**

```
/ui-iterate <page>
```

---

Does this match what you want to work on today? Confirm and I'll get started,
or say `skip` to auto-select the next PR after this one.

### 6. Stop and wait

Do not open any other files, write any code, or run any commands until the user
explicitly confirms.

## What this skill does NOT load

To keep context lean, this skill deliberately does NOT read:

- The other 12 design docs (read only what you need today)
- `FitHub-UIUX-Brainstorm-Redesign.html` (too large; use only if a specific
  decision needs to be traced back to research)
- `IMPLEMENTATION-PLAN.md` (the HANDOVER tracker has the summary you need)
- `research_claude_design_iteration.md` (already embedded in the `ui-iterate` skill)

If you need context from another doc mid-session, read it on demand — don't
pre-load everything at the start.
