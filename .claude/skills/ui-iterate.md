# Skill: ui-iterate

Iterative UI/UX design loop for a single FitHub page or component. Screenshots
the running app, critiques against the FitHub design system, applies fixes, and
repeats until the sign-off checklist passes. Uses `/loop` to self-pace.

## Usage

```
/ui-iterate <page>
/ui-iterate <page> --focus <area>
/ui-iterate <page> --viewport <mobile|desktop|both>
```

**`<page>`** — one of: `dashboard`, `history`, `logger`, `progress`, `records`,
`coach`, `profile`, `onboarding`, `navigation`, or a custom route path like `/plans/[id]`.

**`--focus`** (optional) — narrow the critique to one area:
`typography` · `spacing` · `mobile` · `accessibility` · `hierarchy` · `states`

**`--viewport`** (optional) — default is `both` (375px + 1280px).

## Design System (authoritative — do not deviate)

### Color palette

| Variable    | Hex       | Use                              |
| ----------- | --------- | -------------------------------- |
| `--bg`      | `#0d1117` | Page background                  |
| `--surface` | `#161b22` | Cards, raised surfaces           |
| `--text`    | `#e6edf3` | Primary text                     |
| `--muted`   | `#8b949e` | Secondary text, labels, metadata |
| `--border`  | `#30363d` | Borders, dividers                |
| `--accent`  | `#58a6ff` | Links, CTAs, active nav state    |
| `--green`   | `#3fb950` | Positive, streak active, PR      |
| `--amber`   | `#d29922` | Warnings, moderate load          |
| `--red`     | `#ff7b72` | Errors, danger                   |
| `--purple`  | `#bc8cff` | Special achievements             |
| `--cyan`    | `#39d353` | Contribution graph max density   |

### Typography rules

- **All numbers, metrics, durations, distances, weights, hashes:** `font-mono` (JetBrains Mono) — no exceptions
- **Nav, labels, body copy, buttons:** `font-sans` (system-ui)
- No decorative fonts. No Inter. No Poppins.

### Spacing rhythm (8px base)

Valid Tailwind spacing values: `1` (4px) · `2` (8px) · `3` (12px) · `4` (16px) · `5` (20px) · `6` (24px) · `8` (32px) · `10` (40px) · `12` (48px)

- Card padding: `p-4` or `p-6`
- Section gaps: `gap-6` or `gap-8`
- List item gaps: `gap-2` or `gap-3`
- Inline icon-to-text: `gap-1` or `gap-2`

### Navigation

- **Mobile (< 768px):** bottom tab bar + inset FAB, `env(safe-area-inset-bottom)` applied
- **Desktop (≥ 768px):** shadcn Sidebar, 64px collapsed / 256px expanded
- Single `md:` breakpoint — no intermediate states

### Component rules

- Touch targets ≥ 44px on mobile (all buttons, links, tab items)
- No horizontal overflow at any mobile viewport
- `prefers-reduced-motion` respected on all animations
- Git-themed copy where natural: "commit", "push", "branch", "repo"

## Prerequisites

All three must be running before starting:

```bash
pnpm -C apps/web dev          # Next.js dev server at http://localhost:3000
```

If the server is not running, stop and tell the user to start it before proceeding.

## Steps

### 1. Pre-flight

- Use `browser_navigate` to `http://localhost:3000/<route>`.
- If it returns a 404, error, or redirect to login (and login is not the target page), stop and report.
- Read the relevant design doc:
  - For a page: `claude_docs/planning/frontend-revamp/page-<name>.md`
  - For navigation: `claude_docs/planning/frontend-revamp/cross-navigation-layout.md`
  - For the library migration: `claude_docs/planning/frontend-revamp/cross-library-migration.md`
- Note any blockers called out in that doc (backend endpoints not yet implemented, etc.).

### 2. Capture baseline screenshots (label: BEFORE)

For **mobile** (unless `--viewport desktop`):

1. `browser_resize` to width `375`, height `812`
2. `browser_navigate` to `http://localhost:3000/<route>` (reload at new size)
3. `browser_scroll` to top
4. `browser_take_screenshot` → label this **BEFORE-mobile**

For **desktop** (unless `--viewport mobile`):

1. `browser_resize` to width `1280`, height `900`
2. `browser_navigate` to reload
3. `browser_take_screenshot` → label this **BEFORE-desktop**

### 3. Overflow detection (mobile only, run once)

At 375px, run `browser_evaluate` with this script and report any elements that overflow:

```javascript
JSON.stringify(
  Array.from(document.querySelectorAll("*"))
    .filter((el) => el.scrollWidth > el.clientWidth)
    .map((el) => ({
      tag: el.tagName,
      cls: el.className.substring(0, 80),
      overflow: el.scrollWidth - el.clientWidth,
    })),
);
```

Fix any overflows before proceeding to the critique — overflow is always a blocker.

### 4. Structured critique

Analyse each BEFORE screenshot and produce a numbered issue list. Use this exact format per issue:

```
N. ELEMENT: <which element or area>
   CURRENT: <what it looks like now — be specific>
   FIX: <exactly what Tailwind class or code change to make>
   PRIORITY: blocker | major | minor
```

Critique through these lenses **in priority order** (skip any lens excluded by `--focus`):

**a) Visual hierarchy**

- Is there one clear primary focal point per section?
- Do headings scale down meaningfully (h1 > h2 > h3)?
- Does secondary content visually recede vs primary?

**b) Spacing consistency**

- Does all padding/gap follow the 8px rhythm?
- Are sibling cards and list items evenly spaced?
- Is section-to-section breathing room consistent?

**c) Typography**

- Are ALL numbers/metrics in `font-mono`?
- Is muted text (`#8b949e`) used for secondary info only, not required reading?
- Is any text below 14px (too small)?

**d) Alignment**

- Do edges align to the grid?
- Are there any ragged left/right edges inside cards?
- Are icons and text baselines aligned?

**e) Mobile-specific** (375px only)

- Touch targets ≥ 44px?
- Bottom nav clearing safe area?
- FAB inset pattern correct?
- Text not truncating unexpectedly?

**f) Brand consistency**

- Colors match the palette above — no off-system values?
- Git theme present but not forced?
- No sports/pastels aesthetic?

### 5. Apply fixes

Apply every **blocker** and **major** issue from the critique. For **minor** issues, apply them if they take < 5 minutes; otherwise note them.

After applying, run:

```bash
pnpm -C apps/web typecheck 2>&1 | tail -20
```

Fix any TypeScript errors before taking the after screenshot.

### 6. Capture after screenshots (label: AFTER)

Repeat Step 2 at the same viewports. Label screenshots **AFTER-mobile** and **AFTER-desktop**.

### 7. Compare and iterate

Compare BEFORE vs AFTER screenshots. Report:

```
✅ Resolved: [list each fixed issue]
⚠️  Partial:  [list each partially improved issue + what remains]
❌ Unchanged: [list each unresolved issue + why]
➕ New issues: [list any regressions introduced]
```

If there are remaining **blockers** or **major** issues, go back to Step 4 and iterate.
Continue iterating until only **minor** issues remain (maximum 4 cycles — if not converging, report the blockers and stop).

### 8. Check additional states

Once the primary layout converges, check the states that apply to this page:

For each applicable state, navigate to it (or trigger it via Playwright), screenshot, and apply the same critique:

- **Loading state** — does the skeleton/spinner match the dark theme?
- **Empty state** — is there a helpful empty state message, not a blank void?
- **Error state** — does it look designed, not like a browser error?
- **Mobile + keyboard visible** — does the layout handle the soft keyboard (if forms are present)?

### 9. Accessibility snapshot

```
browser_snapshot
```

Report any violations found:

- Buttons or links with no accessible name
- Heading hierarchy violations (skipped levels)
- Form fields without associated labels
- Images without `alt` text

Fix any violations before sign-off.

### 10. Sign-off checklist

Run through this checklist for each viewport tested. State PASS or FAIL per item:

```
□ Primary content visible above fold (no scroll needed to understand the page)
□ Typography hierarchy unambiguous (heading > content > metadata)
□ No horizontal overflow at 375px
□ All touch targets ≥ 44px (mobile)
□ Spacing follows 8px rhythm — no arbitrary pixel values
□ ALL numbers and metrics in font-mono
□ Colors match design system palette — no off-system values
□ Git theme maintained — professional, not sporty
□ Empty / loading / error states designed (not default browser / blank)
□ TypeScript: zero errors (pnpm -C apps/web typecheck)
□ "Fresh eyes" test: looks like a professional developer tool
```

Only call the page complete when all 11 items are PASS at both viewports.

### 11. Capture baseline snapshot for regression

Once sign-off passes, tell the user to run:

```bash
pnpm --filter web test:e2e -- --update-snapshots
```

This captures the Playwright visual baseline for regression prevention.

### 12. Update the handoff doc

Open `claude_docs/planning/frontend-revamp/FRONTEND-REVAMP-HANDOVER.md` and update the Progress Tracker table — change the relevant branch row from `🔲 Not started` to `✅ Done`.

### 13. Final report

Output a concise summary:

```
## ui-iterate: <page> — Complete

Viewports tested: 375px, 1280px
Cycles: N
Issues found: N blocker, N major, N minor
Issues resolved: N
Remaining minor issues: [list if any]
States validated: default, loading, empty, error (as applicable)
Accessibility: pass / N violations fixed
Sign-off: ✅ PASS / ❌ FAIL (see blockers above)
```

Include the AFTER-mobile and AFTER-desktop screenshots inline so the user sees the final result.

## Route map

| Argument     | Route                         | Design doc                   |
| ------------ | ----------------------------- | ---------------------------- |
| `dashboard`  | `/dashboard`                  | `page-dashboard.md`          |
| `history`    | `/history`                    | `page-history.md`            |
| `logger`     | `/log/new`                    | `page-logger.md`             |
| `progress`   | `/analytics`                  | `page-progress.md`           |
| `records`    | `/records`                    | `page-records.md`            |
| `coach`      | `/coach`                      | `page-coach.md`              |
| `profile`    | `/profile`                    | `page-profile-settings.md`   |
| `onboarding` | `/onboarding`                 | `cross-onboarding.md`        |
| `navigation` | `/dashboard` (check nav only) | `cross-navigation-layout.md` |

## What this skill does NOT do

- It does not implement new features — it refines the visual output of what is already built.
- It does not run backend changes — for backend blockers, note them and move on.
- It does not push or create PRs — those are separate steps after sign-off.
