-- pgTAP RLS isolation tests for public.workouts and public.results
-- Run with: supabase test db
-- Requires: alembic upgrade head already applied.

BEGIN;
SELECT plan(12);

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

-- Insert one workout for Alice and one for Bob as superuser (bypasses RLS).
INSERT INTO public.workouts (id, user_id, performed_at, short_hash)
VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', '00000001-0000-0000-0000-000000000001', now(), 'aaaaaaaa'),
  ('bbbbbbbb-0000-0000-0000-000000000002', '00000002-0000-0000-0000-000000000002', now(), 'bbbbbbbb')
ON CONFLICT (id) DO NOTHING;

-- Insert one result for Alice's workout.
INSERT INTO public.results (user_id, workout_id, result_type, reps)
VALUES
  ('00000001-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'reps', 10)
ON CONFLICT DO NOTHING;

-- ── Impersonate Alice ──────────────────────────────────────────────────────────
SET LOCAL role = authenticated;
SET LOCAL "request.jwt.claims" = '{"sub":"00000001-0000-0000-0000-000000000001","role":"authenticated"}';

SELECT is(
  (SELECT count(*)::int FROM public.workouts WHERE id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  1,
  'Alice can see her own workout'
);

SELECT is(
  (SELECT count(*)::int FROM public.workouts WHERE id = 'bbbbbbbb-0000-0000-0000-000000000002'),
  0,
  'Alice cannot see Bob''s workout'
);

SELECT is(
  (SELECT count(*)::int FROM public.workouts),
  1,
  'Table scan returns only Alice''s workout'
);

SELECT is(
  (SELECT count(*)::int FROM public.results WHERE workout_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  1,
  'Alice can see her own result'
);

SELECT is(
  (SELECT count(*)::int FROM public.results WHERE workout_id = 'bbbbbbbb-0000-0000-0000-000000000002'),
  0,
  'Alice cannot see Bob''s results'
);

-- ── Alice INSERT ───────────────────────────────────────────────────────────────
SELECT lives_ok(
  $$INSERT INTO public.workouts (user_id, performed_at, short_hash)
    VALUES ('00000001-0000-0000-0000-000000000001', now(), 'cccccccc')$$,
  'Alice can insert her own workout'
);

-- Alice cannot INSERT a workout for Bob.
SELECT throws_ok(
  $$INSERT INTO public.workouts (user_id, performed_at, short_hash)
    VALUES ('00000002-0000-0000-0000-000000000002', now(), 'dddddddd')$$,
  NULL,
  NULL,
  'Alice cannot insert a workout for Bob'
);

-- ── Impersonate Bob ────────────────────────────────────────────────────────────
SET LOCAL role = authenticated;
SET LOCAL "request.jwt.claims" = '{"sub":"00000002-0000-0000-0000-000000000002","role":"authenticated"}';

SELECT is(
  (SELECT count(*)::int FROM public.workouts WHERE id = 'bbbbbbbb-0000-0000-0000-000000000002'),
  1,
  'Bob can see his own workout'
);

SELECT is(
  (SELECT count(*)::int FROM public.workouts WHERE id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  0,
  'Bob cannot see Alice''s workout'
);

SELECT is(
  (SELECT count(*)::int FROM public.workouts),
  1,
  'Table scan returns only Bob''s workout (Alice''s INSERT above is rolled back with plan())'
);

-- Bob cannot DELETE Alice's workout.
-- DELETE runs, RLS silently drops the row from scope → 0 rows deleted.
-- RESET ROLE returns to session user (postgres/superuser) to verify.
DELETE FROM public.workouts WHERE id = 'aaaaaaaa-0000-0000-0000-000000000001';
RESET ROLE;
SELECT is(
  (SELECT count(*)::int FROM public.workouts WHERE id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  1,
  'Bob cannot delete Alice''s workout — row still exists'
);

-- Re-impersonate Bob to test UPDATE.
SET LOCAL role = authenticated;
SET LOCAL "request.jwt.claims" = '{"sub":"00000002-0000-0000-0000-000000000002","role":"authenticated"}';

-- Bob cannot UPDATE Alice's workout (title stays NULL after failed update).
UPDATE public.workouts SET title = 'hacked' WHERE id = 'aaaaaaaa-0000-0000-0000-000000000001';
RESET ROLE;
SELECT is(
  (SELECT title FROM public.workouts WHERE id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  NULL,
  'Bob cannot update Alice''s workout — title still NULL'
);

SELECT * FROM finish();
ROLLBACK;
