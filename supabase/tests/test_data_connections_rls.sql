-- pgTAP: RLS isolation for data_connections
-- Verifies that Alice cannot read Bob's data_connection rows.

BEGIN;
SELECT plan(4);

-- ── Fixtures ──────────────────────────────────────────────────────────────────

DO $$
BEGIN
  INSERT INTO auth.users (id, email, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
  VALUES
    ('00000001-0000-0000-0000-000000000001', 'alice@rls2.test', now(), now(), '{}', '{}'),
    ('00000002-0000-0000-0000-000000000002', 'bob@rls2.test',   now(), now(), '{}', '{}')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (id, handle, display_name)
  VALUES
    ('00000001-0000-0000-0000-000000000001', 'alice_rls2', 'Alice RLS2'),
    ('00000002-0000-0000-0000-000000000002', 'bob_rls2',   'Bob RLS2')
  ON CONFLICT (id) DO NOTHING;
END;
$$;

-- Insert Bob's data_connection as superuser
INSERT INTO data_connections (user_id, provider, config)
VALUES ('00000002-0000-0000-0000-000000000002', 'apple_health',
        '{"ingest_token_hash":"bob_hash","ingest_token_prefix":"fh_ah_bob"}')
ON CONFLICT (user_id, provider) DO NOTHING;

-- Insert Alice's data_connection as superuser
INSERT INTO data_connections (user_id, provider, config)
VALUES ('00000001-0000-0000-0000-000000000001', 'apple_health',
        '{"ingest_token_hash":"alice_hash","ingest_token_prefix":"fh_ah_ali"}')
ON CONFLICT (user_id, provider) DO NOTHING;

-- ── Test 1: Alice sees only her own connection ─────────────────────────────────

SET LOCAL role TO authenticated;
SET LOCAL "request.jwt.claims" TO '{"sub": "00000001-0000-0000-0000-000000000001"}';

SELECT is(
  (SELECT COUNT(*)::int FROM data_connections),
  1,
  'Alice sees exactly 1 data_connection row'
);

SELECT is(
  (SELECT user_id::text FROM data_connections LIMIT 1),
  '00000001-0000-0000-0000-000000000001',
  'Alice can only see her own data_connection'
);

-- ── Test 2: Bob sees only his own connection ───────────────────────────────────

SET LOCAL "request.jwt.claims" TO '{"sub": "00000002-0000-0000-0000-000000000002"}';

SELECT is(
  (SELECT COUNT(*)::int FROM data_connections),
  1,
  'Bob sees exactly 1 data_connection row'
);

SELECT is(
  (SELECT user_id::text FROM data_connections LIMIT 1),
  '00000002-0000-0000-0000-000000000002',
  'Bob can only see his own data_connection'
);

RESET role;

SELECT * FROM finish();
ROLLBACK;
