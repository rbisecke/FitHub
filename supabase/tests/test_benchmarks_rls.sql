BEGIN;
SELECT plan(2);

-- Seed as superuser (benchmarks is reference data, only insertable by admin)
INSERT INTO public.benchmarks (name) VALUES ('Fran Test') ON CONFLICT (name) DO NOTHING;

-- authenticated user can read benchmarks
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO '{"sub":"00000001-0000-0000-0000-000000000001","role":"authenticated"}';

SELECT ok(
  (SELECT COUNT(*) FROM public.benchmarks WHERE name = 'Fran Test') > 0,
  'authenticated user can read benchmarks'
);

-- anon cannot read benchmarks
SET LOCAL ROLE anon;
SELECT throws_ok(
  $$SELECT * FROM public.benchmarks$$,
  '42501',
  'permission denied for table benchmarks',
  'anon cannot read benchmarks'
);

SELECT * FROM finish();
ROLLBACK;
