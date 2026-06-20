-- pgTAP: RLS isolation for metric_samples
-- Verifies that Alice cannot read Bob's metric_samples rows.
-- Run with: pnpm supabase test db (or supabase test db locally)

BEGIN;
SELECT plan(4);

-- ── Fixtures ──────────────────────────────────────────────────────────────────

DO $$
BEGIN
  INSERT INTO auth.users (id, email, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
  VALUES
    ('00000001-0000-0000-0000-000000000001', 'alice@rls.test', now(), now(), '{}', '{}'),
    ('00000002-0000-0000-0000-000000000002', 'bob@rls.test',   now(), now(), '{}', '{}')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (id, handle, display_name)
  VALUES
    ('00000001-0000-0000-0000-000000000001', 'alice_rls', 'Alice RLS'),
    ('00000002-0000-0000-0000-000000000002', 'bob_rls',   'Bob RLS')
  ON CONFLICT (id) DO NOTHING;
END;
$$;

-- Insert Bob's metric sample bypassing RLS (as service role / superuser)
INSERT INTO metric_samples (user_id, type, value, unit, source, source_priority, started_at)
VALUES ('00000002-0000-0000-0000-000000000002', 'hrv_sdnn', 55.0, 'ms', 'apple_health', 3,
        '2026-01-01T06:00:00Z')
ON CONFLICT DO NOTHING;

-- Insert Alice's metric sample
INSERT INTO metric_samples (user_id, type, value, unit, source, source_priority, started_at)
VALUES ('00000001-0000-0000-0000-000000000001', 'hrv_sdnn', 42.0, 'ms', 'apple_health', 3,
        '2026-01-01T06:00:00Z')
ON CONFLICT DO NOTHING;

-- ── Test 1: Alice sees only her own row ───────────────────────────────────────

SET LOCAL role TO authenticated;
SET LOCAL "request.jwt.claims" TO '{"sub": "00000001-0000-0000-0000-000000000001"}';

SELECT is(
  (SELECT COUNT(*)::int FROM metric_samples),
  1,
  'Alice sees exactly 1 metric_samples row (her own)'
);

SELECT is(
  (SELECT user_id::text FROM metric_samples LIMIT 1),
  '00000001-0000-0000-0000-000000000001',
  'Alice only sees her own user_id in metric_samples'
);

-- ── Test 2: Bob sees only his own row ─────────────────────────────────────────

SET LOCAL "request.jwt.claims" TO '{"sub": "00000002-0000-0000-0000-000000000002"}';

SELECT is(
  (SELECT COUNT(*)::int FROM metric_samples),
  1,
  'Bob sees exactly 1 metric_samples row (his own)'
);

SELECT is(
  (SELECT user_id::text FROM metric_samples LIMIT 1),
  '00000002-0000-0000-0000-000000000002',
  'Bob only sees his own user_id in metric_samples'
);

RESET role;

SELECT * FROM finish();
ROLLBACK;
