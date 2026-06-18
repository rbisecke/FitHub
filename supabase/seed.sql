-- Local development seed data.
-- Loaded by `supabase start` and `supabase db reset`.
-- Never runs in production — manage invites via the admin API there.
--
-- NOTE: Supabase runs this seed before Alembic migrations, so the
-- invited_emails table may not exist yet. The DO block is a no-op in
-- that case; run `alembic upgrade head` to create the schema, then
-- `supabase db reset` to apply seed data.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'invited_emails'
  ) THEN
    INSERT INTO public.invited_emails (email)
    VALUES ('dev@example.com')
    ON CONFLICT (email) DO NOTHING;
  END IF;
END;
$$;
