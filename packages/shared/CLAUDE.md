# packages/shared — shared TypeScript types

## Purpose
Single source of truth for types shared between `apps/web` and `apps/api`.
Generated Supabase types (`supabase gen types typescript --local`) go in `src/database.ts`.

## Rules
- Types only — no runtime logic, no dependencies beyond TypeScript.
- All exports from `src/index.ts`.
- Keep types aligned with the Alembic schema; regenerate `database.ts` after every migration.

## Commands
```bash
pnpm typecheck    # tsc --noEmit
```
