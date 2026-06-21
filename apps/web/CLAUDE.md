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
