-- pgTAP RLS isolation tests for team_sessions, team_session_participants, notifications
-- Run with: supabase test db (from project root)
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

-- Seed: Alice creates a team session; Bob is a participant.
-- Done as superuser so setup is independent of policy correctness.
INSERT INTO public.team_sessions (id, created_by, performed_at)
VALUES ('cccccccc-0000-0000-0000-000000000001',
        '00000001-0000-0000-0000-000000000001', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.team_session_participants (team_session_id, user_id)
VALUES
  ('cccccccc-0000-0000-0000-000000000001', '00000001-0000-0000-0000-000000000001'),
  ('cccccccc-0000-0000-0000-000000000001', '00000002-0000-0000-0000-000000000002')
ON CONFLICT DO NOTHING;

-- Seed: a notification for Bob
INSERT INTO public.notifications (id, user_id, type, payload)
VALUES ('dddddddd-0000-0000-0000-000000000001',
        '00000002-0000-0000-0000-000000000002',
        'workout_link_pending', '{"team_session_id":"cccccccc-0000-0000-0000-000000000001"}')
ON CONFLICT (id) DO NOTHING;

-- ── Test 1: Creator (Alice) can SELECT her own session ─────────────────────────
SET LOCAL role = authenticated;
SET LOCAL "request.jwt.claims" = '{"sub":"00000001-0000-0000-0000-000000000001","role":"authenticated"}';

SELECT is(
  (SELECT count(*)::int FROM public.team_sessions
   WHERE id = 'cccccccc-0000-0000-0000-000000000001'),
  1,
  'creator can select own session'
);

-- ── Test 2: Participant (Bob) can SELECT via ts_is_participant helper ──────────
SET LOCAL "request.jwt.claims" = '{"sub":"00000002-0000-0000-0000-000000000002","role":"authenticated"}';

SELECT is(
  (SELECT count(*)::int FROM public.team_sessions
   WHERE id = 'cccccccc-0000-0000-0000-000000000001'),
  1,
  'participant can select session'
);

-- ── Test 3: Non-participant sees 0 rows ───────────────────────────────────────
-- User 3 has no profile row but RLS only checks auth.uid() match, not profile existence.
SET LOCAL "request.jwt.claims" = '{"sub":"00000003-0000-0000-0000-000000000003","role":"authenticated"}';

SELECT is(
  (SELECT count(*)::int FROM public.team_sessions
   WHERE id = 'cccccccc-0000-0000-0000-000000000001'),
  0,
  'non-participant cannot select session'
);

-- ── Test 4: Non-creator cannot INSERT with a foreign created_by ───────────────
SET LOCAL "request.jwt.claims" = '{"sub":"00000002-0000-0000-0000-000000000002","role":"authenticated"}';

SELECT throws_ok(
  $$INSERT INTO public.team_sessions (id, created_by, performed_at)
    VALUES ('eeeeeeee-0000-0000-0000-000000000001',
            '00000001-0000-0000-0000-000000000001', now())$$,
  'new row violates row-level security policy for table "team_sessions"',
  'non-creator cannot insert session with foreign created_by'
);

-- ── Test 5: Non-creator UPDATE is silently blocked (0 rows affected) ──────────
-- Pattern: run UPDATE as Bob, RESET to superuser, confirm row unchanged.
UPDATE public.team_sessions SET name = 'hacked'
WHERE id = 'cccccccc-0000-0000-0000-000000000001';
RESET role;

SELECT is(
  (SELECT name FROM public.team_sessions WHERE id = 'cccccccc-0000-0000-0000-000000000001'),
  NULL,
  'non-creator update silently blocked — name still NULL'
);

-- ── Test 6: Non-creator DELETE is silently blocked ────────────────────────────
SET LOCAL role = authenticated;
SET LOCAL "request.jwt.claims" = '{"sub":"00000002-0000-0000-0000-000000000002","role":"authenticated"}';

DELETE FROM public.team_sessions WHERE id = 'cccccccc-0000-0000-0000-000000000001';
RESET role;

SELECT is(
  (SELECT count(*)::int FROM public.team_sessions
   WHERE id = 'cccccccc-0000-0000-0000-000000000001'),
  1,
  'non-creator delete silently blocked — row still exists'
);

-- ── Test 7: Participant (Bob) can UPDATE own participant row ──────────────────
SET LOCAL role = authenticated;
SET LOCAL "request.jwt.claims" = '{"sub":"00000002-0000-0000-0000-000000000002","role":"authenticated"}';

UPDATE public.team_session_participants
SET role = 'anchor'
WHERE team_session_id = 'cccccccc-0000-0000-0000-000000000001'
  AND user_id = '00000002-0000-0000-0000-000000000002';
RESET role;

SELECT is(
  (SELECT role FROM public.team_session_participants
   WHERE team_session_id = 'cccccccc-0000-0000-0000-000000000001'
     AND user_id = '00000002-0000-0000-0000-000000000002'),
  'anchor',
  'participant can update own participant row'
);

-- ── Test 8: Non-participant cannot UPDATE another user's participant row ───────
SET LOCAL role = authenticated;
SET LOCAL "request.jwt.claims" = '{"sub":"00000003-0000-0000-0000-000000000003","role":"authenticated"}';

UPDATE public.team_session_participants
SET role = 'hacker'
WHERE team_session_id = 'cccccccc-0000-0000-0000-000000000001'
  AND user_id = '00000001-0000-0000-0000-000000000001';
RESET role;

SELECT is(
  (SELECT role FROM public.team_session_participants
   WHERE team_session_id = 'cccccccc-0000-0000-0000-000000000001'
     AND user_id = '00000001-0000-0000-0000-000000000001'),
  NULL,
  'non-participant cannot update another user participant row'
);

-- ── Test 9: Bob sees own notification ─────────────────────────────────────────
SET LOCAL role = authenticated;
SET LOCAL "request.jwt.claims" = '{"sub":"00000002-0000-0000-0000-000000000002","role":"authenticated"}';

SELECT is(
  (SELECT count(*)::int FROM public.notifications
   WHERE id = 'dddddddd-0000-0000-0000-000000000001'),
  1,
  'user can select own notification'
);

-- ── Test 10: Alice cannot see Bob's notification ──────────────────────────────
SET LOCAL "request.jwt.claims" = '{"sub":"00000001-0000-0000-0000-000000000001","role":"authenticated"}';

SELECT is(
  (SELECT count(*)::int FROM public.notifications
   WHERE id = 'dddddddd-0000-0000-0000-000000000001'),
  0,
  'alice cannot see bob notification'
);

-- ── Test 11: Bob can mark own notification read ───────────────────────────────
SET LOCAL "request.jwt.claims" = '{"sub":"00000002-0000-0000-0000-000000000002","role":"authenticated"}';

UPDATE public.notifications SET read_at = now()
WHERE id = 'dddddddd-0000-0000-0000-000000000001'
  AND user_id = '00000002-0000-0000-0000-000000000002';
RESET role;

SELECT isnt(
  (SELECT read_at FROM public.notifications
   WHERE id = 'dddddddd-0000-0000-0000-000000000001'),
  NULL,
  'bob can mark own notification read'
);

-- ── Test 12: Cascade delete — participants gone, workouts unaffected ──────────
DELETE FROM public.team_sessions WHERE id = 'cccccccc-0000-0000-0000-000000000001';

SELECT is(
  (SELECT count(*)::int FROM public.team_session_participants
   WHERE team_session_id = 'cccccccc-0000-0000-0000-000000000001'),
  0,
  'participants cascade-deleted when team session deleted'
);

SELECT * FROM finish();
ROLLBACK;
