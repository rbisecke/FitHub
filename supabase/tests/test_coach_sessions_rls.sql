-- pgTAP RLS isolation tests for public.coach_sessions and public.coach_messages
-- Run with: supabase test db
-- Requires: alembic upgrade head already applied.

BEGIN;
SELECT plan(10);

-- ── Seed two test users ────────────────────────────────────────────────────────
DO $$
BEGIN
  INSERT INTO auth.users (id, email, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
  VALUES
    ('00000001-0000-0000-0000-000000000001', 'alice@test.local', now(), now(), '{}', '{}'),
    ('00000002-0000-0000-0000-000000000002', 'bob@test.local',   now(), now(), '{}', '{}')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (id, handle, display_name)
  VALUES
    ('00000001-0000-0000-0000-000000000001', 'alice_rls', 'Alice RLS'),
    ('00000002-0000-0000-0000-000000000002', 'bob_rls',   'Bob RLS')
  ON CONFLICT (id) DO NOTHING;
END;
$$;

-- Insert sessions as superuser (bypasses RLS)
INSERT INTO public.coach_sessions (id, user_id, title)
VALUES
  ('aaaaaaaa-1111-0000-0000-000000000001', '00000001-0000-0000-0000-000000000001', 'Alice session'),
  ('bbbbbbbb-2222-0000-0000-000000000002', '00000002-0000-0000-0000-000000000002', 'Bob session')
ON CONFLICT (id) DO NOTHING;

-- Insert messages as superuser
INSERT INTO public.coach_messages (session_id, role, content)
VALUES
  ('aaaaaaaa-1111-0000-0000-000000000001', 'user',      'Alice question'),
  ('aaaaaaaa-1111-0000-0000-000000000001', 'assistant', 'Alice answer'),
  ('bbbbbbbb-2222-0000-0000-000000000002', 'user',      'Bob question'),
  ('bbbbbbbb-2222-0000-0000-000000000002', 'assistant', 'Bob answer')
ON CONFLICT DO NOTHING;

-- ── Impersonate Alice ──────────────────────────────────────────────────────────
SET LOCAL role = authenticated;
SET LOCAL "request.jwt.claims" = '{"sub":"00000001-0000-0000-0000-000000000001","role":"authenticated"}';

SELECT is(
  (SELECT count(*)::int FROM public.coach_sessions WHERE id = 'aaaaaaaa-1111-0000-0000-000000000001'),
  1,
  'Alice can see her own session'
);

SELECT is(
  (SELECT count(*)::int FROM public.coach_sessions WHERE id = 'bbbbbbbb-2222-0000-0000-000000000002'),
  0,
  'Alice cannot see Bob session'
);

SELECT is(
  (SELECT count(*)::int FROM public.coach_messages WHERE session_id = 'aaaaaaaa-1111-0000-0000-000000000001'),
  2,
  'Alice can see messages in her own session'
);

SELECT is(
  (SELECT count(*)::int FROM public.coach_messages WHERE session_id = 'bbbbbbbb-2222-0000-0000-000000000002'),
  0,
  'Alice cannot see messages in Bob session'
);

-- ── Impersonate Bob ────────────────────────────────────────────────────────────
-- Note: INSERT on coach_sessions is reserved for service_role (FastAPI backend).
-- Authenticated users only have SELECT; all writes go through the API.
SET LOCAL "request.jwt.claims" = '{"sub":"00000002-0000-0000-0000-000000000002","role":"authenticated"}';

SELECT is(
  (SELECT count(*)::int FROM public.coach_sessions WHERE id = 'bbbbbbbb-2222-0000-0000-000000000002'),
  1,
  'Bob can see his own session'
);

SELECT is(
  (SELECT count(*)::int FROM public.coach_sessions WHERE id = 'aaaaaaaa-1111-0000-0000-000000000001'),
  0,
  'Bob cannot see Alice session'
);

SELECT is(
  (SELECT count(*)::int FROM public.coach_messages WHERE session_id = 'bbbbbbbb-2222-0000-0000-000000000002'),
  2,
  'Bob can see messages in his own session'
);

SELECT is(
  (SELECT count(*)::int FROM public.coach_messages WHERE session_id = 'aaaaaaaa-1111-0000-0000-000000000001'),
  0,
  'Bob cannot see messages in Alice session'
);

-- ── Verify neither user can see the total row count (isolation) ───────────────
SELECT is(
  (SELECT count(*)::int FROM public.coach_sessions),
  -- Only the seeded session belongs to Bob; full-table scan is filtered by RLS.
  1,
  'Bob only sees his own session in full-table scan'
);

-- ── Anon cannot read either table ─────────────────────────────────────────────
SET LOCAL role = anon;

SELECT throws_ok(
  $$SELECT count(*) FROM public.coach_sessions$$,
  NULL, NULL,
  'anon cannot read coach_sessions'
);

SELECT * FROM finish();
ROLLBACK;
