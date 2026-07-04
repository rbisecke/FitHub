# Feature 7 — Polish & Completeness

**Status**: `done`
**Depends on**: Phase 0, Features 1–6 must be merged first
**Design doc**: `claude_docs/user-experience/design/polish-completeness-design.md`

---

## FitHub Quick Context

FitHub is a dark git-themed CrossFit app. Monorepo at `/Users/rbisecke/FitHub`:
- `apps/web/` — Next.js 16 + shadcn/ui + Tailwind v4 frontend
- `apps/api/` — FastAPI + Python 3.14 backend
- Dev server: `pnpm -C apps/web dev`

Key tokens: `--amber:#d29922` (active filters, adaptation banner), `--blue:#58a6ff` (accent/links), `--accent:#4ADE80` (primary CTAs). Read `CLAUDE.md` before starting.

---

## What This Feature Does

Four items that are either functionally broken, architecturally ambiguous, or have competing implementations:

1. **History filters — server-side pagination** is broken: `Load more` fetches unfiltered pages, so date filters can show zero results indefinitely
2. **`/track` route** — retire the route and promote the NL input concept into `/log/new` instead
3. **`FrequencyTargetControl` vs. `FrequencyStepper`** — replace the stepper with the superior segmented control
4. **`AdaptationBanner` placement** — the component works but is not rendered on the dashboard

---

## Prototype Files to Reference

Location: `claude_docs/user-experience/design/prototypes/`

| File | What it shows | Known issue |
|---|---|---|
| `FitHub History Filters.dc.html` | History page with active filter pills, "Load more filtered commits ↓" button, pill remove behavior, slide-up filter sheet with grab handle | Bottom sheet animation verified correct (updated 2026-07-04). |
| `FitHub Log NL Input.dc.html` | `/log/new` with NL input toggle — textarea expands, chip grid dims; "Parse with AI" → 1.5s spinner → pre-populated rows with "parsed" badges |  |
| `FitHub Frequency Target.dc.html` | Settings page with the segmented control (3/4/5/6 options, 44×44px each) |  |
| `FitHub Adaptation Banner.dc.html` | Dashboard with amber banner between stat grid and contribution graph — present (2 adaptations) and absent (stat grid connects directly to graph) |  |

**Bottom sheet animation** (verified in prototype as of 2026-07-04): Enter `translateY(100%) → translateY(0)` over `240ms cubic-bezier(.2,.9,.3,1)`, scrim `fadeIn .15s`, dismiss `translateY(100%)` over `200ms`, grab handle `32×4px` `#30363d` `4px` radius centered `12px` from top.

---

## Git Strategy

```
main
 └── feat/ux-polish
      ├── feat/ux-polish/history-filter-server-pagination
      ├── feat/ux-polish/nl-input-in-log-new
      ├── feat/ux-polish/frequency-control-swap
      └── feat/ux-polish/adaptation-banner-placement
```

---

## Implementation Steps

### Step 1 — History filters: server-side pagination

**Branch**: `feat/ux-polish/history-filter-server-pagination`

**What to fix**: The "Load more" button on `/history` fetches the next unfiltered page from the server regardless of active filters. Fix this so when any server-side filter is active, `Load more` passes the filter state to the server.

**Server-side filter dimensions** (these must be sent to the API):
- `sessionType` (strength/metcon/skill/endurance/etc.)
- `partnerOnly` (boolean)
- `dateFrom` / `dateTo` (ISO date strings)

**Client-side only** (stays client-side, no server pass-through):
- Movement filter (triggered by tapping a movement name in a card)

**Behavior**:
- **Active filter + load more**: query server with current filter state, append filtered results directly (skip client-side `applyClientFilters`)
- **Clear a filter**: reset cursor to beginning, fresh server fetch with no filter
- **Switch a filter**: same as clear — cursor resets

**Visual communication**:
- Active filter pill row: below the filter bar, amber pill per active dimension ("Strength ×", "Jun 1–30 ×"). Each pill has × to clear that dimension. Far right: ghost "Clear all" link in muted text.
- "Load more" label when filter active: change to "Load more filtered commits ↓"
- Empty state with active date filter + more pages available: add "There may be older commits matching these filters — keep scrolling to load them" note below the "∅" message

**Bottom sheet animation** (Fix 2): The filter sheet must animate in correctly:
- Enter: `translateY(100%) → translateY(0)` over `240ms cubic-bezier(.2,.9,.3,1)`. Scrim fades in over 150ms.
- Dismiss (scrim tap or × ): sheet slides to `translateY(100%)` over 200ms, scrim fades out over 150ms.
- Grab handle: centered `32×4px` bar, `--border` color, 4px radius, 12px below sheet top edge.

**Key files**:
- `apps/web/app/(app)/history/page.tsx` or the history page component
- The filter sheet component
- The "Load more" / pagination logic

**Prototype reference**: `FitHub History Filters.dc.html` — for the pill row visual design, the "Load more filtered commits ↓" label, and the slide-up sheet animation (all verified correct).

**Acceptance criteria**:
- [x] Active filter pills row renders below filter bar, each pill has × to clear
- [x] "Load more filtered commits ↓" label when any filter is active
- [x] Clearing/switching a filter resets the cursor
- [x] Loaded results with active filter already match the filter (no client-side re-filtering)
- [x] History filter bottom sheet has slide-up animation (grab handle + correct cubic-bezier)
- [x] Movement filter (client-side) is unaffected
- [x] PR title: `fix: history page load more respects active filters with server-side pagination`

---

### Step 2 — NL input in `/log/new` (retire `/track`)

**Branch**: `feat/ux-polish/nl-input-in-log-new`

**What to build**:

**Retire `/track`**: Delete the `/track` page route and the `components/track/` directory (StagedChanges, MovementBrowser, SessionDetails, RPEStepper, TrackPage). If `/track` currently redirects to `/log/new`, that redirect can stay (keeps URLs stable) or can be deleted — your call. The 7 track components listed in the design doc are the ones to delete; `NLInputBox` is salvaged.

**Promote NL input to `/log/new`**: Add an "or describe your workout" toggle at the top-right of the movement chip card in `/log/new`. Tapping it:
1. Expands a textarea with placeholder "Tell me what you did — 3×5 back squat 100kg, 3 rounds Fran, 2k row…" (monospace font) — 200ms expand
2. The movement chip row dims (not interactive while NL area is expanded)
3. Shows "Parse with AI" button (blue with small sparkle icon) + muted "or browse movements ↓" link
4. On submit → 1.5s loading state ("Parsing…" with spinner) → parser returns results → movement rows pre-populate in the set table below with muted green "parsed" badges on each row
5. NL textarea collapses back to toggle link after parsing

The toggle itself is a small muted text link: "or describe your workout" positioned at the top-right of the movement chip card.

**Key files**:
- `apps/web/app/(app)/log/new/` — the `LogPageClient` component
- `apps/web/components/track/NLInputBox.tsx` — salvage and adapt
- `apps/api/` — the NL parsing endpoint (check if it exists; if not, it needs to be created or stubbed)
- Delete: `apps/web/components/track/` (all except NLInputBox)

**Prototype reference**: `FitHub Log NL Input.dc.html` — interact with the full flow: toggle → textarea → "Parse with AI" → spinner → pre-populated rows with "parsed" badges.

**Acceptance criteria**:
- [x] `/log/new` has "or describe your workout" toggle
- [x] Textarea expands correctly on tap, chip row dims
- [x] "Parse with AI" calls the backend, shows spinner, pre-populates movement rows
- [x] "parsed" badges visible on pre-populated rows
- [x] Toggle collapses after parsing
- [x] Track route components deleted (except NLInputBox behavior retained)
- [x] No regressions on existing `/log/new` structured form flow
- [x] PR title: `feat: add NL input toggle to /log/new, retire /track route`

---

### Step 3 — FrequencyTargetControl replaces FrequencyStepper

**Branch**: `feat/ux-polish/frequency-control-swap`

**What to build**: In the settings/profile page where training frequency is set, replace `FrequencyStepper` with `FrequencyTargetControl`.

`FrequencyTargetControl` already exists and is the better component (4 visible options at once, 44×44px touch targets, proper `radiogroup` semantics). This step just swaps the import and deletes the old component.

**Label text to use**: "Days per week you aim to train" (from `FrequencyTargetControl`) over "Sessions per week" (from `FrequencyStepper`).

**Key files**:
- Find where `FrequencyStepper` is rendered (settings page, profile page, or plan creation flow)
- `apps/web/components/settings/FrequencyStepper.tsx` — delete after swap
- `apps/web/components/settings/FrequencyTargetControl.tsx` — already built

**Prototype reference**: `FitHub Frequency Target.dc.html` — shows the segmented control in context of a settings page. Options 3/4/5/6, 44×44px each, default selected is 4.

**Acceptance criteria**:
- [x] `FrequencyTargetControl` renders in place of `FrequencyStepper` on the settings page
- [x] All 4 options (3/4/5/6) visible simultaneously
- [x] Single-select, 120ms transition on selection
- [x] Debounce-saves to API on change (same behavior as before)
- [x] `FrequencyStepper.tsx` deleted
- [x] PR title: `refactor: replace FrequencyStepper with FrequencyTargetControl`

---

### Step 4 — AdaptationBanner placement

**Branch**: `feat/ux-polish/adaptation-banner-placement`

**What to build**: `AdaptationBanner` is a complete component that returns `null` when there are no pending adaptations. It just needs to be rendered on the dashboard, in the correct position.

**Placement**: between the stat grid and the contribution graph — immediately after the stat cards, before the heatmap.

**Only renders when `count > 0`**. When 0, the stat grid connects directly to the contribution graph with no gap.

**Copy format** (from design doc): `$ git diff --plan · 2 adaptations pending review →`
- `$ git diff --plan` is a muted monospace prefix
- Count "2" in a small amber filled badge
- "adaptations pending review →" in amber text
- Entire banner is a tappable link to the plan

**Visual style**:
- Background: `--amber` (#d29922) at 15% opacity
- Border: `--amber` at 40% opacity
- Rounded corners
- Full width on mobile (16px horizontal padding inside)
- Thin strip on desktop

**Key files**:
- `apps/web/app/(app)/dashboard/page.tsx` (or home page)
- `apps/web/components/dashboard/AdaptationBanner.tsx` — already built, needs `planId` prop

**Prototype reference**: `FitHub Adaptation Banner.dc.html` — toggle between present (2 adaptations) and absent (stat grid directly connects to graph) states. The amber color at 15% opacity is subtle but visible.

**Acceptance criteria**:
- [x] Banner renders between stat grid and contribution graph
- [x] Only renders when `count > 0`
- [x] Copy follows `$ git diff --plan · N adaptations pending review →` format
- [x] Amber styling (15% opacity background, border)
- [x] Entire banner tappable, navigates to plan
- [x] When 0 adaptations: stat grid and contribution graph have no gap between them
- [x] PR title: `feat: render AdaptationBanner on dashboard between stat grid and graph`

---

## Validation Protocol

After all steps are merged into the base branch:

1. **Dev server**: `pnpm -C apps/web dev`
2. **Desktop screenshots** (1280px): History page (with active filters showing pill row), `/log/new` (NL toggle expanded), settings page (segmented frequency control), dashboard (adaptation banner visible)
3. **Mobile screenshots** (375px): Same pages; history filter bottom sheet with correct slide-up animation; dashboard with adaptation banner
4. **Compare against prototypes**: `FitHub History Filters.dc.html` (pills + load more label), `FitHub Log NL Input.dc.html` (full NL flow), `FitHub Frequency Target.dc.html` (segmented control), `FitHub Adaptation Banner.dc.html` (banner placement)
5. **Fix 2 verification**: History filter bottom sheet MUST animate in with slide-up (prototype is wrong, implementation must be correct)
6. **E2E flows**:
   - History: apply "Strength" filter + date range → "Load more filtered commits ↓" → verify new results match filters
   - Clear one filter pill → verify list reloads from server without that filter
   - Log new: "or describe your workout" → type a workout → "Parse with AI" → verify movement rows pre-populated
   - Settings: change frequency via segmented control → reload → verify saved
   - Dashboard: if active plan exists with pending adaptations → banner appears → tap → navigates to plan
7. **TypeScript + lint**: zero errors; no references to deleted `/track` components

---

## Definition of Done

- [x] All 4 step branches merged into `feat/ux-polish` via CI-passing PRs
- [x] Desktop and mobile screenshots compared against prototypes
- [x] History filter bottom sheet animation verified correct (Fix 2 properly implemented)
- [x] E2E flows verified through the browser
- [x] `FrequencyStepper.tsx` deleted (no orphaned imports)
- [x] Track route components deleted (no orphaned imports)
- [x] Final PR `feat/ux-polish` → `main` merged with CI passing
- [x] Status updated to `done` in this file and in `MASTER-HANDOFF.md`
