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

-- Official movement catalog.
-- Wrapped in a DO block so this is a no-op before `alembic upgrade head`.
-- Keep in sync with migration 0047_expand_movement_catalog.py.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'movements'
  ) THEN
    INSERT INTO public.movements
        (name, slug, base_movement, modality,
         default_result_types, default_result_type,
         primary_muscle_group, is_official)
    VALUES
        -- Strength: core lifts
        ('Back Squat',        'back-squat',        'Squat',    'strength',       ARRAY['weight','reps'],            'weight', 'legs', true),
        ('Front Squat',       'front-squat',       'Squat',    'strength',       ARRAY['weight','reps'],            'weight', 'legs', true),
        ('Overhead Squat',    'overhead-squat',    'Squat',    'strength',       ARRAY['weight','reps'],            'weight', 'legs', true),
        ('Box Squat',         'box-squat',         'Squat',    'strength',       ARRAY['weight','reps'],            'weight', 'legs', true),
        ('Goblet Squat',      'goblet-squat',      'Squat',    'strength',       ARRAY['weight','reps'],            'weight', 'legs', true),
        ('Bulgarian Split Squat','bulgarian-split-squat','Squat','strength',     ARRAY['weight','reps'],            'weight', 'legs', true),
        ('Zercher Squat',     'zercher-squat',     'Squat',    'strength',       ARRAY['weight','reps'],            'weight', 'legs', true),
        ('Deadlift',          'deadlift',          'Deadlift', 'strength',       ARRAY['weight','reps'],            'weight', 'legs', true),
        ('Romanian Deadlift', 'romanian-deadlift', 'Deadlift', 'strength',       ARRAY['weight','reps'],            'weight', 'legs', true),
        ('Sumo Deadlift',     'sumo-deadlift',     'Deadlift', 'strength',       ARRAY['weight','reps'],            'weight', 'legs', true),
        ('Trap Bar Deadlift', 'trap-bar-deadlift', 'Deadlift', 'strength',       ARRAY['weight','reps'],            'weight', 'legs', true),
        ('Good Morning',      'good-morning',      'Deadlift', 'strength',       ARRAY['weight','reps'],            'weight', 'legs', true),
        ('Bench Press',       'bench-press',       'Press',    'strength',       ARRAY['weight','reps'],            'weight', 'push', true),
        ('Strict Press',      'strict-press',      'Press',    'strength',       ARRAY['weight','reps'],            'weight', 'push', true),
        ('Push Press',        'push-press',        'Press',    'strength',       ARRAY['weight','reps'],            'weight', 'push', true),
        -- Weightlifting: Snatch family
        ('Snatch',            'snatch',            'Snatch',   'weightlifting',  ARRAY['weight','reps'],            'weight', 'legs', true),
        ('Power Snatch',      'power-snatch',      'Snatch',   'weightlifting',  ARRAY['weight','reps'],            'weight', 'legs', true),
        ('Hang Snatch',       'hang-snatch',       'Snatch',   'weightlifting',  ARRAY['weight','reps'],            'weight', 'legs', true),
        ('Hang Power Snatch', 'hang-power-snatch', 'Snatch',   'weightlifting',  ARRAY['weight','reps'],            'weight', 'legs', true),
        ('High Hang Snatch',  'high-hang-snatch',  'Snatch',   'weightlifting',  ARRAY['weight','reps'],            'weight', 'legs', true),
        ('High Hang Power Snatch','high-hang-power-snatch','Snatch','weightlifting',ARRAY['weight','reps'],         'weight', 'legs', true),
        ('Muscle Snatch',     'muscle-snatch',     'Snatch',   'weightlifting',  ARRAY['weight','reps'],            'weight', 'legs', true),
        ('Snatch Balance',    'snatch-balance',    'Snatch',   'weightlifting',  ARRAY['weight','reps'],            'weight', 'legs', true),
        ('Snatch Pull',       'snatch-pull',       'Snatch',   'weightlifting',  ARRAY['weight','reps'],            'weight', 'legs', true),
        ('Snatch Grip Deadlift','snatch-grip-deadlift','Snatch','weightlifting', ARRAY['weight','reps'],            'weight', 'legs', true),
        -- Weightlifting: Clean family
        ('Clean',             'clean',             'Clean',    'weightlifting',  ARRAY['weight','reps'],            'weight', 'legs', true),
        ('Power Clean',       'power-clean',       'Clean',    'weightlifting',  ARRAY['weight','reps'],            'weight', 'legs', true),
        ('Hang Clean',        'hang-clean',        'Clean',    'weightlifting',  ARRAY['weight','reps'],            'weight', 'legs', true),
        ('Hang Power Clean',  'hang-power-clean',  'Clean',    'weightlifting',  ARRAY['weight','reps'],            'weight', 'legs', true),
        ('High Hang Clean',   'high-hang-clean',   'Clean',    'weightlifting',  ARRAY['weight','reps'],            'weight', 'legs', true),
        ('High Hang Power Clean','high-hang-power-clean','Clean','weightlifting',ARRAY['weight','reps'],            'weight', 'legs', true),
        ('Muscle Clean',      'muscle-clean',      'Clean',    'weightlifting',  ARRAY['weight','reps'],            'weight', 'legs', true),
        ('Clean Pull',        'clean-pull',        'Clean',    'weightlifting',  ARRAY['weight','reps'],            'weight', 'legs', true),
        ('Clean Grip Deadlift','clean-grip-deadlift','Clean',  'weightlifting',  ARRAY['weight','reps'],            'weight', 'legs', true),
        ('Clean and Jerk',    'clean-and-jerk',    'Clean',    'weightlifting',  ARRAY['weight','reps'],            'weight', 'legs', true),
        -- Weightlifting: Jerk family
        ('Split Jerk',        'split-jerk',        'Jerk',     'weightlifting',  ARRAY['weight','reps'],            'weight', 'push', true),
        ('Push Jerk',         'push-jerk',         'Jerk',     'weightlifting',  ARRAY['weight','reps'],            'weight', 'push', true),
        ('Power Jerk',        'power-jerk',        'Jerk',     'weightlifting',  ARRAY['weight','reps'],            'weight', 'push', true),
        -- Gymnastics: pull
        ('Pull-Up',           'pull-up',           'Pull-Up',  'gymnastics',     ARRAY['reps'],                     'reps',   'pull', true),
        ('Strict Pull-Up',    'strict-pull-up',    'Pull-Up',  'gymnastics',     ARRAY['reps'],                     'reps',   'pull', true),
        ('Chest-to-Bar Pull-Up','chest-to-bar-pull-up','Pull-Up','gymnastics',   ARRAY['reps'],                     'reps',   'pull', true),
        ('Weighted Pull-Up',  'weighted-pull-up',  'Pull-Up',  'gymnastics',     ARRAY['reps','weight'],            'reps',   'pull', true),
        ('Ring Muscle-Up',    'ring-muscle-up',    'Muscle-Up','gymnastics',     ARRAY['reps'],                     'reps',   'pull', true),
        ('Bar Muscle-Up',     'bar-muscle-up',     'Muscle-Up','gymnastics',     ARRAY['reps'],                     'reps',   'pull', true),
        ('Rope Climb',        'rope-climb',        'Rope Climb','gymnastics',    ARRAY['reps'],                     'reps',   'pull', true),
        -- Gymnastics: push
        ('Handstand Push-Up', 'handstand-push-up', 'Push-Up',  'gymnastics',     ARRAY['reps'],                     'reps',   'push', true),
        ('Strict Handstand Push-Up','strict-handstand-push-up','Push-Up','gymnastics',ARRAY['reps'],                'reps',   'push', true),
        ('Push-Up',           'push-up',           'Push-Up',  'gymnastics',     ARRAY['reps'],                     'reps',   'push', true),
        ('Ring Push-Up',      'ring-push-up',      'Push-Up',  'gymnastics',     ARRAY['reps'],                     'reps',   'push', true),
        ('Dip',               'dip',               'Dip',      'gymnastics',     ARRAY['reps'],                     'reps',   'push', true),
        ('Ring Dip',          'ring-dip',          'Dip',      'gymnastics',     ARRAY['reps'],                     'reps',   'push', true),
        -- Gymnastics: core / skill
        ('Toes-to-Bar',       'toes-to-bar',       'Toes-to-Bar','gymnastics',   ARRAY['reps'],                     'reps',   'core', true),
        ('Knees-to-Elbows',   'knees-to-elbows',   'Toes-to-Bar','gymnastics',   ARRAY['reps'],                     'reps',   'core', true),
        ('GHD Sit-Up',        'ghd-sit-up',        'GHD',      'gymnastics',     ARRAY['reps'],                     'reps',   'core', true),
        ('Hip Extension',     'hip-extension',     'GHD',      'gymnastics',     ARRAY['reps'],                     'reps',   'legs', true),
        ('L-Sit',             'l-sit',             'L-Sit',    'gymnastics',     ARRAY['time'],                     'time',   'core', true),
        ('Wall Walk',         'wall-walk',         'Wall Walk','gymnastics',     ARRAY['reps'],                     'reps',   'push', true),
        ('Pistol Squat',      'pistol-squat',      'Squat',    'gymnastics',     ARRAY['reps'],                     'reps',   'legs', true),
        ('Wall Ball',         'wall-ball',         'Wall Ball','gymnastics',     ARRAY['reps'],                     'reps',   'legs', true),
        -- Plyometric
        ('Box Jump',          'box-jump',          'Box Jump', 'plyometric',     ARRAY['reps'],                     'reps',   'legs', true),
        ('Box Jump Over',     'box-jump-over',     'Box Jump', 'plyometric',     ARRAY['reps'],                     'reps',   'legs', true),
        ('Broad Jump',        'broad-jump',        'Jump',     'plyometric',     ARRAY['reps'],                     'reps',   'legs', true),
        -- Mono-structural
        ('Row',               'row',               'Row',      'mono_structural',ARRAY['distance','time'],          'distance','conditioning',true),
        ('Run',               'run',               'Run',      'mono_structural',ARRAY['distance','time'],          'distance','conditioning',true),
        ('Assault Bike',      'assault-bike',      'Bike',     'mono_structural',ARRAY['calories','time','distance'],'calories','conditioning',true),
        ('Bike Erg',          'bike-erg',          'Bike',     'mono_structural',ARRAY['calories','time','distance'],'calories','conditioning',true),
        ('Ski Erg',           'ski-erg',           'Ski',      'mono_structural',ARRAY['calories','time','distance'],'calories','conditioning',true),
        ('Double Under',      'double-under',      'Jump Rope','mono_structural',ARRAY['reps'],                     'reps',   'conditioning',true),
        ('Single Under',      'single-under',      'Jump Rope','mono_structural',ARRAY['reps'],                     'reps',   'conditioning',true),
        ('Burpee',            'burpee',            'Burpee',   'mono_structural',ARRAY['reps'],                     'reps',   'conditioning',true),
        ('Burpee Box Jump Over','burpee-box-jump-over','Burpee','mono_structural',ARRAY['reps'],                    'reps',   'conditioning',true)
    ON CONFLICT (slug) DO NOTHING;
  END IF;
END;
$$;
