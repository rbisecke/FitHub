# packages/shared — shared TypeScript types

## Purpose

Shared, framework-agnostic (non-JSX) code between `apps/web` and `apps/api`: types,
Zod schemas, and **pure utility math** (09 §9 — the redesign home for the plate/warm-up
calculator, cardio-conversion table, and deterministic identity-color hash).
Generated Supabase types (`supabase gen types typescript --local`) go in `src/database.ts`.

## Rules

- Framework-agnostic only — **no JSX, no React, no DOM APIs**. Pure TypeScript that
  runs in both the Next.js and (potentially) Node contexts. Utility math is allowed
  and expected; UI wrappers that consume it live in `apps/web/components/shared`.
- Colors: utilities return **token names/indices**, never raw hex, so callers resolve
  them through CSS custom properties in either theme.
- All exports flow through `src/index.ts`.
- Keep DB types aligned with the Alembic schema; regenerate `database.ts` after every migration.
- Consumed by `apps/web` as the `@fithub/shared` workspace dependency.

## Commands

```bash
pnpm typecheck    # tsc --noEmit
```
