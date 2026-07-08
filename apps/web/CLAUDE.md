# apps/web — Next.js frontend

## Stack

Next.js 16 (App Router) · TypeScript strict · Tailwind v4 · shadcn/ui (Phase 3+) · Vitest · Playwright (e2e)

## Commands

```bash
pnpm dev              # start dev server (localhost:3000)
pnpm build            # production build
pnpm typecheck        # tsc --noEmit
pnpm lint             # eslint
pnpm test             # vitest run
pnpm test:watch       # vitest (watch mode)
pnpm generate-types   # regenerate lib/api/generated.ts from openapi.json
```

**Run `pnpm generate-types` whenever the FastAPI `response_model` for any route changes.** Commit `lib/api/generated.ts` alongside the API change.

**Dev server lifecycle — kill it when done.** `next dev` (Turbopack) is CPU-intensive and will slow down the user's machine if left running. Always start it with `run_in_background`, capture the PID, and kill it as soon as the task that needed it is complete (e.g. after taking screenshots). Pattern:

```bash
pnpm -C /Users/rbisecke/FitHub/apps/web dev &> /tmp/fithub-dev.log &
DEV_PID=$!
# ... do work (screenshots, smoke test, etc.) ...
kill $DEV_PID
```

## Key conventions

- **App Router only** — no Pages Router.
- All components in `components/`; pages/layouts in `app/`.
- No `any` — use proper types or `unknown` + narrowing.
- Tailwind classes only — no inline styles, no CSS modules (except globals.css).
- Server Components by default; add `"use client"` only when needed (event handlers, hooks).
- All data fetching goes through the FastAPI (`apps/api`), not directly to Supabase — except auth-only flows via `@supabase/ssr`.
- Environment variables: `NEXT_PUBLIC_*` for client-safe values; never expose service-role key.

## Auth pattern

- `@supabase/ssr` handles the session in middleware and Server Components.
- After login, pass the Supabase JWT as `Authorization: Bearer <token>` to FastAPI.
- Do not call Supabase data endpoints from the frontend; all data goes through FastAPI.

## Testing

- Unit tests in `__tests__/` (Vitest).
- e2e tests in `e2e/` (Playwright) — run against `localhost:3000`.
- One meaningful test required before any PR is merged.

## Mandatory coding rules (enforced by audit — do not violate)

These rules exist because each was violated in generated code and caused real bugs.

### Date handling

- **Never parse date-only ISO strings with `new Date(isoString)`.** `new Date("2025-03-15")` is parsed as UTC midnight — in UTC-5 that's the previous calendar day. Always decompose:
  ```typescript
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  const date = new Date(y, m - 1, d); // local midnight
  ```
- **Never emit UTC date strings for local-date keys.** `date.toISOString().slice(0, 10)` emits a UTC date. Build local date keys from `getFullYear()`, `getMonth() + 1`, `getDate()`.
- **Time-sensitive state (today's date, current time) must update at runtime.** Do not compute "today" in a `useMemo` with empty deps. Use a `useState` initialized to the current value plus a `setInterval` cleanup effect that refreshes every minute.

### Async fetch patterns

Every `useEffect` that fetches data must follow this pattern — no exceptions:

```typescript
useEffect(() => {
  const controller = new AbortController();
  let cancelled = false;

  fetchSomething({ signal: controller.signal })
    .then((data) => {
      if (!cancelled) setState(data);
    })
    .catch((err) => {
      if (!cancelled && !controller.signal.aborted) setError(err);
    });

  return () => {
    cancelled = true;
    controller.abort();
  };
}, [deps]);
```

Rules:

- `AbortController` signal **must be forwarded** to the actual fetch call. Creating a controller but not passing the signal only guards state, it does not cancel the HTTP request.
- The `cancelled` flag guards all state setters in `.then` and `.catch` callbacks.
- The cleanup must call both `controller.abort()` AND set `cancelled = true`.
- Multiple concurrent fetch effects (e.g., period switch, movement switch) must each get their own `cancelled` flag — they cannot share one controller.

### Design tokens — no hardcoded colors ever

- **Use CSS custom properties, not hex values.** Replace any hardcoded color with its token:
  | Hex | Token |
  |-----|-------|
  | `#0d1117` | `var(--bg)` |
  | `#161b22` | `var(--surface)` |
  | `#e6edf3` | `var(--text)` |
  | `#8b949e` | `var(--muted)` |
  | `#30363d` | `var(--border)` |
  | `#58a6ff` | `var(--accent)` |
  | `#3fb950` | `var(--green)` |
  | `#d29922` | `var(--amber)` |
  | `#ff7b72` | `var(--red)` |
  | `#bc8cff` | `var(--purple)` |

- **No Tailwind color utilities for semantic colors.** Never use `text-red-400`, `bg-orange-500`, `text-yellow-300`, etc. Use `text-[var(--red)]`, `bg-[var(--amber)]`, etc.
- **SVG attributes accept CSS custom properties** in all modern browsers: `fill="var(--surface)"` is valid.
- **Recharts and other chart libraries** that only accept hex strings in their data arrays: define constants at the top of the file using `getComputedStyle(document.documentElement).getPropertyValue("--accent")` at runtime, or hard-code the single canonical hex value as a named constant (e.g., `const ACCENT = "#58a6ff"`) with a comment referencing the token name.

### Error handling

- **Every async event handler must have try/catch with user-visible feedback.** If `api.x.y()` rejects and there is no catch, the user gets no feedback and the UI may be stuck. Pattern:
  ```typescript
  async function handleSubmit() {
    try {
      await api.profile.patch(payload);
      goToNextStep();
    } catch {
      setError("Something went wrong. Please try again.");
    }
  }
  ```

### React keys

- **List keys must be stable entity identifiers**, not array indices. Use `item.id`, `item.user_id`, `item.url`, etc. Fall back to a composite key before using index:
  ```tsx
  key={item.id ?? `${item.created_at}-${item.type}`}
  ```
- **Citation chips, partner rows, error log rows**: any list that can reorder or grow must have a stable key.

### Accessibility

- **Toggle buttons need `aria-label`** describing what they control, not just `aria-expanded`. Example: `aria-label="Toggle WOD check panel"`.
