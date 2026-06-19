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

-- Official movement catalog (14 foundational CrossFit/functional-fitness movements).
-- Wrapped in a DO block so this is a no-op before `alembic upgrade head`.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'movements'
  ) THEN
    INSERT INTO public.movements
        (name, slug, base_movement, modality, default_result_types, is_official)
    VALUES
        -- Strength
        ('Back Squat',        'back-squat',        'Squat',        'strength',       ARRAY['weight','reps'],   true),
        ('Front Squat',       'front-squat',        'Squat',        'strength',       ARRAY['weight','reps'],   true),
        ('Overhead Squat',    'overhead-squat',     'Squat',        'strength',       ARRAY['weight','reps'],   true),
        ('Deadlift',          'deadlift',           'Deadlift',     'strength',       ARRAY['weight','reps'],   true),
        ('Bench Press',       'bench-press',        'Press',        'strength',       ARRAY['weight','reps'],   true),
        ('Strict Press',      'strict-press',       'Press',        'strength',       ARRAY['weight','reps'],   true),
        -- Weightlifting
        ('Clean',             'clean',              'Clean',        'weightlifting',  ARRAY['weight','reps'],   true),
        ('Clean and Jerk',    'clean-and-jerk',     'Clean',        'weightlifting',  ARRAY['weight','reps'],   true),
        ('Snatch',            'snatch',             'Snatch',       'weightlifting',  ARRAY['weight','reps'],   true),
        -- Gymnastics
        ('Pull-Up',           'pull-up',            'Pull-Up',      'gymnastics',     ARRAY['reps'],            true),
        ('Handstand Push-Up', 'handstand-push-up',  'Push-Up',      'gymnastics',     ARRAY['reps'],            true),
        ('Ring Muscle-Up',    'ring-muscle-up',     'Muscle-Up',    'gymnastics',     ARRAY['reps'],            true),
        -- Mono-structural
        ('Row',               'row',                'Row',          'mono_structural',ARRAY['distance','time'], true),
        ('Run',               'run',                'Run',          'mono_structural',ARRAY['distance','time'], true)
    ON CONFLICT (slug) DO NOTHING;
  END IF;
END;
$$;
