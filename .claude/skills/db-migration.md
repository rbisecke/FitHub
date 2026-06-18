# Skill: db-migration

Create an Alembic migration with RLS and type generation.

## Steps

1. Write the SQLAlchemy model in `apps/api/app/models/<table>.py`
2. `uv run alembic revision --autogenerate -m "<description>"` from `apps/api/`
3. Review the generated migration — ensure RLS is enabled:
   ```sql
   ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;
   ```
4. Write pgTAP tests in `supabase/tests/<table>_rls.sql`
5. `supabase db reset` — confirm clean apply
6. `supabase test db` — all RLS tests green
7. `supabase gen types typescript --local > packages/shared/src/database.ts`
8. `pnpm -C apps/web tsc --noEmit` — shared types compile

## Rules

- One table per task (one migration per PR).
- Every table must have RLS enabled and policies for SELECT/INSERT/UPDATE/DELETE.
- Generate types after every migration.
