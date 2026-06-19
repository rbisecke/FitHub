# FitHub Design System

## Palette (GitHub-dark base)

```
bg:       #0d1117   # page background
surface:  #161b22   # cards, sidebar
border:   #30363d
text:     #e6edf3
muted:    #8b949e
```

## Semantic colours (git-theme)

```
hash:     #ffa657   # commit short-hash (Geist Mono)
diff-add: #3fb950   # added lines / PR counts up
diff-del: #f85149   # removed lines / weight down
coauthor: #d2a8ff   # co-authored-by badge (partner sessions)
contrib:  #26a641   # contribution graph active square
```

## Typography

```
body:   -apple-system, Segoe UI, Roboto, sans-serif (16px)
data:   ui-monospace, "Geist Mono", "SF Mono", Menlo (all numbers, hashes, RPE values)
```

## Git-theme UI patterns

- Short hash displayed as orange mono badge (8 chars, `font-mono text-orange-400`)
- "Co-authored-by" purple badge on partner/team workouts
- Contribution graph: 52×7 day grid, zinc-800=rest, green gradient=active, amber=partner
- Sidebar nav labels use $ prefix: `$ git log`, `$ git commit`
- Empty states use CLI metaphor: "No commits yet. Run git commit --fit"
- Form headings: `$ git commit --fit` (new), `$ git commit --amend` (edit)

## Tailwind class conventions

```
Background hierarchy:
  zinc-950 — page background (body)
  zinc-900 — sidebar, cards
  zinc-800 — card hover border, cell resting
  zinc-700 — subtle border, input background

Text hierarchy:
  zinc-100 — primary (titles, values)
  zinc-300 — secondary (labels)
  zinc-400 — body text
  zinc-500 — muted / placeholders
  zinc-600 — very muted

Session type badge colours:
  metcon    → text-orange-400 border-orange-800 bg-orange-950
  strength  → text-blue-400 border-blue-800 bg-blue-950
  skill     → text-purple-400 border-purple-800 bg-purple-950
  rest      → text-zinc-400 border-zinc-700 bg-zinc-900
  mixed     → text-teal-400 border-teal-800 bg-teal-950

Modality badge colours (movement search):
  strength        → text-blue-400
  gymnastics      → text-orange-400
  mono_structural → text-green-400
  weightlifting   → text-yellow-400
  plyometric      → text-red-400
  carry           → text-amber-400
  strongman       → text-rose-400
```
