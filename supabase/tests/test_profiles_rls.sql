-- pgTAP RLS isolation tests for public.profiles
-- Run with: supabase test db
-- Requires: alembic upgrade head already applied against the local Supabase instance.

BEGIN;
SELECT plan(8);

-- ── Seed two isolated test users ───────────────────────────────────────────────
DO $$
BEGIN
  INSERT INTO auth.users (id, email, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
  VALUES
    ('00000001-0000-0000-0000-000000000001', 'alice@test.local', now(), now(), '{}', '{}'),
    ('00000002-0000-0000-0000-000000000002', 'bob@test.local',   now(), now(), '{}', '{}')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (id, handle, display_name)
  VALUES
    ('00000001-0000-0000-0000-000000000001', 'alice', 'Alice'),
    ('00000002-0000-0000-0000-000000000002', 'bob',   'Bob')
  ON CONFLICT (id) DO NOTHING;
END;
$$;

-- ── Impersonate Alice ───────────────────────────────────────────────────────────
SET LOCAL role = authenticated;
SET LOCAL "request.jwt.claims" = '{"sub":"00000001-0000-0000-0000-000000000001","role":"authenticated"}';

SELECT is(
  (SELECT count(*)::int FROM public.profiles WHERE id = '00000001-0000-0000-0000-000000000001'),
  1,
  'Alice can see her own profile'
);

SELECT is(
  (SELECT count(*)::int FROM public.profiles WHERE id = '00000002-0000-0000-0000-000000000002'),
  0,
  'Alice cannot see Bob''s profile'
);

SELECT is(
  (SELECT count(*)::int FROM public.profiles),
  1,
  'Table scan returns only Alice''s row'
);

-- Alice can update her own allowed columns
SELECT lives_ok(
  $$UPDATE public.profiles SET display_name = 'Alice Updated'
    WHERE id = '00000001-0000-0000-0000-000000000001'$$,
  'Alice can update her own profile display_name'
);

-- Alice cannot update another user's profile (0 rows affected, not an error)
SELECT is(
  (WITH upd AS (
     UPDATE public.profiles SET display_name = 'Hacked'
     WHERE id = '00000002-0000-0000-0000-000000000002'
     RETURNING id
   ) SELECT count(*)::int FROM upd),
  0,
  'Alice cannot update Bob''s profile (0 rows affected)'
);

-- ── Impersonate service_role ────────────────────────────────────────────────────
SET LOCAL role = service_role;

SELECT is(
  (SELECT count(*)::int FROM public.profiles),
  2,
  'service_role sees all profiles'
);

-- ── Authenticated cannot self-promote role to admin ────────────────────────────
-- Column-level GRANT excludes the role column, so this must raise 42501.
SET LOCAL role = authenticated;
SET LOCAL "request.jwt.claims" = '{"sub":"00000001-0000-0000-0000-000000000001","role":"authenticated"}';

SELECT throws_ok(
  $$UPDATE public.profiles SET role = 'admin'
    WHERE id = '00000001-0000-0000-0000-000000000001'$$,
  '42501',
  NULL,
  'authenticated cannot update role column (privilege escalation blocked)'
);

-- ── anon role cannot read profiles ─────────────────────────────────────────────
SET LOCAL role = anon;

SELECT is(
  (SELECT count(*)::int FROM public.profiles),
  0,
  'anon role sees no profiles'
);

SELECT * FROM finish();
ROLLBACK;
