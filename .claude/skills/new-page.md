# Skill: new-page

Add a new page to apps/web (Next.js App Router).

## Steps

1. Create `apps/web/app/<route>/page.tsx` (Server Component by default)
2. Add `apps/web/app/<route>/layout.tsx` if the page needs its own layout
3. Add auth guard in middleware or via `redirect()` in the page if protected
4. Fetch data via `apps/api` (not Supabase directly) using the Supabase JWT
5. Write a Vitest unit test for any complex client logic
6. Add a Playwright e2e test in `apps/web/e2e/<page>.spec.ts`
7. `pnpm -C apps/web typecheck` — zero errors

## Rules

- Server Components by default; `"use client"` only for event handlers/hooks.
- No inline styles; Tailwind classes only.
- No `any` in TypeScript.
