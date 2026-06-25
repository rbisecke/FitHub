# Frontend Revamp — Handover & Progress Tracker

**Base branch:** `feat/ui-revamp` (branches off `main`; sub-PRs branch off this and merge back in)
**Started:** 2026-06-24
**Goal:** Complete UI/UX redesign — navigation, pages, library migration, gamification, onboarding, profile. No live users, so no graceful migrations required — rip and replace is safe.

---

## Status at a Glance

| Phase | Status | Notes |
|-------|--------|-------|
| Design research & brainstorm | ✅ Done | `FitHub-UIUX-Brainstorm-Redesign.html` |
| Library research | ✅ Done | Section 9 of brainstorm doc |
| Layout/nav research | ✅ Done | Section 6 of brainstorm doc |
| Per-page design docs | ✅ Done | All 13 docs in this directory |
| Design doc accuracy review | ✅ Done | Each doc has `## Accuracy Review` section |
| Design iteration tooling | ✅ Done | Playwright MCP, Chrome DevTools MCP, Unlighthouse |
| CLAUDE.md design system | ✅ Done | Color palette, typography, spacing encoded |
| Implementation | 🔄 In progress | F1–F9, F12, F13 merged; B1–B5 merged; F10/F11 unblocked; B6–B7 not started |

---

## Branch Strategy

```
main
└── feat/ui-revamp          ← base branch for all UI work (long-lived, pushed to remote)
    ├── feat/ui-setup        → PR → feat/ui-revamp (CI must pass) → merge → delete
    ├── feat/ui-navigation   → PR → feat/ui-revamp (CI must pass) → merge → delete
    ├── feat/ui-dashboard    → PR → feat/ui-revamp (CI must pass) → merge → delete
    ├── ...
    └── (final PR feat/ui-revamp → main when ALL sub-PRs are merged and stable)
```

**Rules:**
- `feat/ui-revamp` is pushed to remote and stays there for the duration of the revamp
- Every sub-branch branches off `feat/ui-revamp`, not `main`
- Each sub-branch gets a **GitHub PR targeting `feat/ui-revamp`** (not main) — this is what triggers CI
- CI must pass on the sub-branch PR before merging into `feat/ui-revamp`
- Merge sub-PRs via GitHub (not local merge) so the CI gate is enforced
- Keep PRs small — one concern each, roughly one design doc per PR
- `feat/ui-revamp` does **not** merge to `main` until all sub-PRs are merged and the full revamp is stable
- Name sub-branches using `feat/ui-<descriptor>` pattern

---

## Design Artifacts

All design docs live in this directory (`claude_docs/planning/frontend-revamp/`).

| Doc | Coverage | Key finding |
|-----|----------|-------------|
| `page-dashboard.md` | Dashboard page | `api.analytics.personalRecords` is net-new; `/records` link is a future-404 until that route exists |
| `page-records.md` | Personal Records page | New `/records` route; `personalRecords` data is currently discarded with destructuring hole in analytics page |
| `page-logger.md` | Log workout page | WorkoutForm already has partial progressive disclosure; `m.result_type` doesn't exist (need `default_result_type` column) |
| `page-history.md` | Workout history | `WorkoutSummary.short_hash`, `has_pr`, `Result.is_pr` exist in generated types; Sheet/Collapsible need install |
| `page-progress.md` | Analytics / progress | Route is `/analytics`, not `/progress`; destructuring bug at `page.tsx:23` drops `personalRecords` |
| `page-coach.md` | AI coach | **No streaming endpoint exists** — current router is non-streaming only; all session endpoints are net-new |
| `page-profile-settings.md` | Profile + settings | `unit_preference` column (not `weight_unit`); `'lb'` not `'lbs'`; no profile router yet |
| `cross-navigation-layout.md` | Nav + layout system | `viewport-fit=cover` missing; `/integrations`, `/plans`, `/injuries` exist but drop from new nav |
| `cross-library-migration.md` | @nivo → recharts swap | CSS chart vars already exist in globals.css as placeholders; must replace not add |
| `cross-motivation-gamification.md` | Streak, toasts, animations | `is_pr` is always client-supplied (never server-computed); readiness score is 0–1 (multiply ×100 for display) |
| `cross-onboarding.md` | Onboarding flow | `unit_preference` / `'lb'`; no profile PATCH endpoint yet; middleware.ts already handles auth redirect |
| `page-tag.md` | `git tag` quick-milestone screen | New feature (brainstormed 2026-06-25); single-movement, FAB speed-dial + Records entry, `is_tag` DB flag (B7) |
| `IMPLEMENTATION-PLAN.md` | Full implementation order | 6 backend PRs + 11 frontend PRs with dependency graph |

**Brainstorm doc:** `claude_docs/planning/FitHub-UIUX-Brainstorm-Redesign.html`
**Design iteration guide:** `claude_docs/research_claude_design_iteration.md`

---

## Implementation Sequence

### Backend PRs (must land before dependent frontend work)

| PR | Branch | Scope | Blocks |
|----|--------|-------|--------|
| B1 | `feat/api-last-result` | `GET /workouts/{id}/last-result` endpoint | Logger `prev:` pattern |
| B2 | `feat/api-pr-detection` | Server-side PR detection on result save | Records page, gamification |
| B3 | `feat/api-movement-result-type` | `default_result_type` column on movements | Logger smart defaults |
| B4 | `feat/api-coach-streaming` | SSE streaming + session persistence for coach | Coach page |
| B5 | `feat/api-profile` | `GET + PATCH /profile` endpoint | Profile page, onboarding |
| B6 | `feat/api-training-balance` | `primary_muscle_group` on movements + balance endpoint | Progress training balance widget |
| B7 | `feat/api-tag` | Add `is_tag: boolean DEFAULT false` to workouts table | Tag history-feed differentiation |

### Frontend PRs (ordered — each branches off `feat/ui-revamp`)

| # | Branch | Scope | Depends on |
|---|--------|-------|-----------|
| F1 | `feat/ui-setup` | Install missing shadcn components, motion, sonner, viewport-fix, CSS vars | — |
| F2 | `feat/ui-navigation` | Sidebar + bottom tab bar + inset FAB | F1 |
| F3 | `feat/ui-dashboard` | Dashboard page redesign | F2 |
| F4 | `feat/ui-library-migration` | @nivo → shadcn-calendar-heatmap, wire ChartContainer | F1 |
| F5 | `feat/ui-history` | History page + compact cards + filter sheet | F2 |
| F6 | `feat/ui-logger` | Logger progressive disclosure + prev: pattern | F2, B1 |
| F7 | `feat/ui-progress` | Analytics/progress page + period selector | F2, F4 |
| F8 | `feat/ui-records` | New /records route | F2, B2 |
| F9 | `feat/ui-coach` | Coach streaming UI + session history | F2, B4 |
| F10 | `feat/ui-onboarding` | Onboarding flow (5 screens) | B5 |
| F11 | `feat/ui-profile` | Profile + settings page | B5, F2 |
| F12 | `feat/ui-gamification` | Streak, animations, toasts, celebration | F3, F7, B2 |
| F13 | `feat/ui-tag` | `git tag` quick-milestone screen + FAB speed-dial | F2, B1; F8 optional (Records entry point); B7 optional (history differentiation) |

---

## Progress Tracker

> Update this table as PRs complete. Mark with ✅ Done, 🔄 In Progress, or 🔲 Not Started.

| Branch | Status | PR # | Notes |
|--------|--------|------|-------|
| `feat/ui-setup` | ✅ Done | — | shadcn components, motion, react-day-picker, heatmap, globals.css FitHub palette, viewport-fit, TooltipProvider |
| `feat/ui-navigation` | ✅ Done | — | shadcn Sidebar, MobileBottomNav+FAB, AppShell, MobileHeader+DesktopHeader, nav-config.ts, skip-nav, aria-current, reduced-motion |
| `feat/ui-dashboard` | ✅ Done | #49 | HeroBlock, StreakWidget, WeekMiniGraph, ContributionGraphRevamp (2-month heatmap), RecentPRsStrip, TrainingPartnersSummary, DashboardSkeleton; fixed DayPicker v10 heatmap cell coloring (no inner button in no-selection mode), dot visibility, AppShell bottom-nav clearance; also fixed use-mobile lint error |
| `feat/ui-library-migration` | ✅ Done | #50 | @nivo/calendar removed; ChartContainer migration; --chart-*/--heatmap-* CSS vars (hex, not oklch — Turbopack cache issue); lib/chart-utils, motion, toast; DonutChart/KpiCard; @hookform/resolvers 5→4 fix; heatmap green scale; cell size 28→20px; Supabase client guard moved inside createClient() to unblock Vercel SSG |
| `feat/ui-history` | ✅ Done | #51 | Commit-log feed with collapsible WorkoutCard (ARIA expand, AnimatePresence), date separators, client-side filters (sessionType/partner/date), desktop inline row + mobile bottom sheet (key-remount pattern, no useEffect setState), load-more pagination, BENCHMARK/Co-authored-by/PR badges, benchmarks.ts, useRef fetch-guard. ui-iterate polish: layout restructure (mobile trigger in h1 row, desktop row below subtitle), dedup date display, RPE Number() fix, touch targets 44px, aria-pressed/role=group/aria-label a11y, flex-nowrap filter row. Signed off at 375px + 1280px. |
| `feat/ui-logger` | ✅ Done | #53 | Progressive-disclosure logger: NL parse+prefill, movement rows with ResultFields, prev: badge (B1 last-result), AddDetails collapsible (date/title/type/format/duration/RPE/notes/bodyweight), TemplatePicker. UI iterate Cycle 1: h1 size, NL label, touch targets, collapsible text, RPE slider null fix. Cycle 2 (a11y): aria-label on all ResultFields inputs, collapsible trigger min-h-[44px]. Sign-off: ✅ 375px + 1280px. |
| `feat/ui-progress` | ✅ Done | #52 | TrainingSummaryHero (narrative + metric tiles), StrengthProgressSection (e1rm line chart + movement picker), VolumeTrendSection (period selector), TrainingBalanceSection (null-safe), BenchmarkProgressSection (sparklines, null-safe), PRSummaryStrip; benchmarks API endpoint added (GET /api/v1/analytics/benchmarks); destructuring bug fixed; PeriodSelector SelectValue fix; overflow fix; 1-decimal PR weights; seed_progress_demo.sql for local validation |
| `feat/ui-records` | ✅ Done | #56 | `/records` route, PRCard collapsible, category tabs, sparklines, OLS projection, timeline view, empty states, shimmer banner. ui-iterate: CategoryTabs overflow fix, delta double-negative fix, active toggle font-medium. |
| `feat/ui-coach` | ✅ Done | #60 #62 | CoachShell (session list desktop + drawer mobile), ChatPanel (SSE stream, rehydrate from sessions API), MessageBubble (markdown, safety tier, stub badge), ChatInput (auto-resize, stop button), StarterPrompts, SessionList/Drawer/ListItem, TypingIndicator. Lazy session create → router.replace on done event. h-full fix (not h-dvh). ui-iterate (#62): action bar 28→44px, send/stop 36→44px, prompt cards min-h-[44px], comment text contrast fix, always grid-cols-2. |
| `feat/ui-onboarding` | 🔲 Not started | — | Unblocked |
| `feat/ui-profile` | 🔲 Not started | — | Unblocked |
| `feat/ui-gamification` | ✅ Done | #57 | streak milestone toasts, atRisk fix (Thu-Sun), comeback CTA, WeekMiniGraph pulse, PR/initial-commit toasts from logger, EmptyState, AppInit cleanup, Toaster theme. ui-iterate: amber number+bg for atRisk, "weeks committed", "best:" label, single-letter day labels. Seed: realistic 3-5×/week cluster pattern (no checkerboard). |
| `feat/ui-tag` | ✅ Done | #54 | `/log/tag` page + FAB speed-dial + sidebar nav item + history TagCard + filter toggle. ui-iterate: MovementSearch design-system colors + w-full + min-h-[44px]; submit min-h-[48px]. B7 + F8 add history differentiation + Records entry point (stub-safe until those land). |
| `feat/api-last-result` | ✅ Done | — | `LastResult` model + repo + router; 4 tests (auth, 404, recency, user-scope) |
| `feat/api-pr-detection` | ✅ Done | #55 | _flag_prs() UPDATE on create_workout; PersonalRecord extended with load_kg/reps/time_s/prev_best_1rm_kg/delta_kg; movementTrend added to client.ts; 8 new tests |
| `feat/api-movement-result-type` | ✅ Done | — | `default_result_type TEXT` column on movements; logger smart defaults wired |
| `feat/api-coach-streaming` | ✅ Done | #59 | SSE `/chat/stream`, `GET /sessions`, `GET /sessions/{id}/messages`; coach_sessions + coach_messages tables; pgTAP RLS + Playwright E2E |
| `feat/api-profile` | ✅ Done | #61 | GET+PATCH /profile, GET /profile/stats, POST /training-partners, migration 0035 |
| `feat/api-training-balance` | 🔲 Not started | — | |
| `feat/api-tag` | 🔲 Not started | — | Add `is_tag boolean DEFAULT false` to workouts + migration |

---

## Starting a New PR

```bash
# 1. Make sure you're on the base branch and it's up to date
git -C /Users/rbisecke/FitHub checkout feat/ui-revamp
git -C /Users/rbisecke/FitHub pull origin feat/ui-revamp

# 2. Create the sub-branch
git -C /Users/rbisecke/FitHub checkout -b feat/ui-<descriptor>

# 3. Read the relevant design doc
# claude_docs/planning/frontend-revamp/page-<name>.md
# or cross-<name>.md

# 4. Start dev server for visual validation
pnpm -C apps/web dev

# 5. Screenshot baseline before touching anything
# (prompt Claude to use Playwright MCP)

# 6. Implement, iterate with screenshots, converge
# See claude_docs/research_claude_design_iteration.md

# 7. Push the sub-branch and open a PR targeting feat/ui-revamp (not main)
git -C /Users/rbisecke/FitHub push -u origin feat/ui-<descriptor>
gh pr create --base feat/ui-revamp --title "<descriptor>" --body "..."

# 8. Wait for CI to pass, then merge the PR via GitHub
# Do NOT merge locally — the GitHub PR merge is the CI gate

# 9. Pull the updated base branch locally
git -C /Users/rbisecke/FitHub checkout feat/ui-revamp
git -C /Users/rbisecke/FitHub pull origin feat/ui-revamp
```

---

## Packages to Install in F1

Run these as the very first PR:

```bash
# shadcn components not yet installed
pnpm dlx shadcn@latest add sidebar sheet scroll-area collapsible tooltip avatar switch progress radio-group tabs sonner

# Animation library
pnpm --filter web add motion

# shadcn-calendar-heatmap (copy-paste, not npm)
# Grab from: https://github.com/gurbaaz27/shadcn-calendar-heatmap
```

---

## Code to Rip Out (no migration needed)

| Item | File | Replacement |
|------|------|-------------|
| Old nav (inline JSX) | `app/(app)/layout.tsx` | shadcn Sidebar + bottom bar |
| `NavLink` component | `components/NavLink.tsx` | Delete |
| `@nivo/calendar` usage | `components/workout/ContributionGraph.tsx` | shadcn-calendar-heatmap |
| `lib/nivo-theme.ts` | `lib/nivo-theme.ts` | Delete (confirmed present) |
| `nivo` packages | `package.json` | `pnpm --filter web remove @nivo/calendar` |

---

## Key Design Decisions (locked)

- **Navigation breakpoint:** single `md:` (768px) — mobile bottom bar below, sidebar above
- **Inset FAB:** Material Design notch pattern (56px FAB, bar cutout) — preferred over floating FAB
- **Sidebar widths:** 64px collapsed (md:), 256px expanded (lg:)
- **`unit_preference` column name** (not `weight_unit`) — existing DB column
- **`'lb'` value** (not `'lbs'`) — existing CHECK constraint
- **Route stays `/analytics`** — rename to `/progress` deferred, not in this revamp
- **Coach sessions:** lazy-create (DB row written on first message, not before)
- **Streak definition:** consecutive weeks hitting frequency target, not consecutive days
- **Adaptive contribution graph window:** < 30 workouts → 8 weeks; 30–59 → 13 weeks; 60–89 → 26 weeks; 90+ → 52 weeks
- **Contribution graph anchoring (Option A):** when a user's first workout is newer than the default window start, anchor `fromDate` to `firstWorkout - 2 days` so the graph fills left-to-right from their actual start rather than showing leading empty weeks. Header copy changes to "your training history" when anchored. Implemented in `graphWindow(totalWorkouts, firstWorkoutDate)` — see `page-dashboard.md §11`.
- **`is_pr`:** currently always client-supplied (`false`). B2 adds server-side detection.
- **Onboarding guard:** in `app/(app)/layout.tsx` (Server Component), NOT in `middleware.ts`

---

## Seed Data Conventions

Demo data lives in `supabase/seed_progress_demo.sql`. When adding or editing filler workouts,
follow these rules so the contribution heatmap looks realistic rather than mechanical.

**Pattern rules — do this:**
- 3–5 sessions per week, varying week to week
- Include back-to-back training days: Mon/Tue, Wed/Thu, or Fri/Sat clusters
- Include multi-day rest gaps (2–3 days between clusters, not always 1)
- Some lighter weeks (2–3 sessions), some heavier (4–5)
- Occasionally skip a whole week or arrive late in a week (life happens)

**Avoid — this creates a visual checkerboard in the heatmap:**
- Every-other-day scheduling (`Apr 1, 3, 5, 7, 9 …`)
- A fixed weekly template repeated with no variation
- All workouts on the same days of the week across every week

The current filler block uses annotated week comments (`-- Week N (dates): pattern`) to
make the intent clear. Keep that convention when editing.

---

## Tooling Setup (already done)

| Tool | Status | Usage |
|------|--------|-------|
| Playwright MCP | ✅ Connected | Screenshots, viewport testing, overflow detection |
| Chrome DevTools MCP | ✅ Added | `claude mcp add chrome-devtools -- npx -y chrome-devtools-mcp@latest` |
| Unlighthouse | ✅ Installed | `unlighthouse --site http://localhost:3000` |
| shadcn CLI | ✅ Installed | `pnpm dlx shadcn@latest add <component>` |

**Baseline audit command (run once before starting F1):**
```bash
pnpm -C apps/web dev &
sleep 5 && unlighthouse --site http://localhost:3000
```
