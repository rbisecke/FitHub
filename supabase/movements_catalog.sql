-- Full CrossFit/functional-fitness movement catalog (194 movements across 7 modalities).
-- Run this after `alembic upgrade head` to populate the movements table.
-- Safe to run multiple times — ON CONFLICT (slug) DO NOTHING skips existing rows.
-- Sources: CrossFit L1 Training Guide, CrossFit Open 2011-2026, CrossFit Games,
--          Catalyst Athletics (weightlifting taxonomy), CrossFit Gymnastics curriculum.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'movements'
  ) THEN
    INSERT INTO public.movements
        (name, slug, base_movement, modality, default_result_types, is_official, primary_muscle_group)
    VALUES

        -- ── STRENGTH (56) ────────────────────────────────────────────────────────

        -- Squat family
        ('Back Squat',                       'back-squat',                       'Squat',             'strength',       ARRAY['weight','reps'],            true, 'legs'),
        ('Front Squat',                      'front-squat',                      'Squat',             'strength',       ARRAY['weight','reps'],            true, 'legs'),
        ('Overhead Squat',                   'overhead-squat',                   'Squat',             'strength',       ARRAY['weight','reps'],            true, 'legs'),
        ('Pause Back Squat',                 'pause-back-squat',                 'Squat',             'strength',       ARRAY['weight','reps'],            true, 'legs'),
        ('Pause Front Squat',                'pause-front-squat',                'Front Squat',       'strength',       ARRAY['weight','reps'],            true, 'legs'),
        ('Box Squat',                        'box-squat',                        'Squat',             'strength',       ARRAY['weight','reps'],            true, 'legs'),
        ('Goblet Squat',                     'goblet-squat',                     'Squat',             'strength',       ARRAY['weight','reps'],            true, 'legs'),
        ('Bulgarian Split Squat',            'bulgarian-split-squat',            'Squat',             'strength',       ARRAY['weight','reps'],            true, 'legs'),
        ('Zercher Squat',                    'zercher-squat',                    'Squat',             'strength',       ARRAY['weight','reps'],            true, 'legs'),
        ('Kettlebell Front Squat',           'kettlebell-front-squat',           'Front Squat',       'strength',       ARRAY['weight','reps'],            true, 'legs'),
        ('Dumbbell Front Squat',             'dumbbell-front-squat',             'Front Squat',       'strength',       ARRAY['weight','reps'],            true, 'legs'),

        -- Deadlift family
        ('Deadlift',                         'deadlift',                         'Deadlift',          'strength',       ARRAY['weight','reps'],            true, 'legs'),
        ('Sumo Deadlift',                    'sumo-deadlift',                    'Deadlift',          'strength',       ARRAY['weight','reps'],            true, 'legs'),
        ('Romanian Deadlift',                'romanian-deadlift',                'Deadlift',          'strength',       ARRAY['weight','reps'],            true, 'legs'),
        ('Deficit Deadlift',                 'deficit-deadlift',                 'Deadlift',          'strength',       ARRAY['weight','reps'],            true, 'legs'),
        ('Good Morning',                     'good-morning',                     'Good Morning',      'strength',       ARRAY['weight','reps'],            true, 'legs'),
        ('Barbell Hip Thrust',               'barbell-hip-thrust',               'Hip Thrust',        'strength',       ARRAY['weight','reps'],            true, 'legs'),
        ('Kettlebell Deadlift',              'kettlebell-deadlift',              'Deadlift',          'strength',       ARRAY['weight','reps'],            true, 'legs'),
        ('Dumbbell Deadlift',                'dumbbell-deadlift',                'Deadlift',          'strength',       ARRAY['weight','reps'],            true, 'legs'),
        ('Dumbbell Romanian Deadlift',       'dumbbell-romanian-deadlift',       'Romanian Deadlift', 'strength',       ARRAY['weight','reps'],            true, 'legs'),

        -- Press family
        ('Bench Press',                      'bench-press',                      'Press',             'strength',       ARRAY['weight','reps'],            true, 'push'),
        ('Close Grip Bench Press',           'close-grip-bench-press',           'Press',             'strength',       ARRAY['weight','reps'],            true, 'push'),
        ('Incline Bench Press',              'incline-bench-press',              'Press',             'strength',       ARRAY['weight','reps'],            true, 'push'),
        ('Floor Press',                      'floor-press',                      'Press',             'strength',       ARRAY['weight','reps'],            true, 'push'),
        ('Strict Press',                     'strict-press',                     'Press',             'strength',       ARRAY['weight','reps'],            true, 'push'),
        ('Push Press',                       'push-press',                       'Press',             'strength',       ARRAY['weight','reps'],            true, 'push'),
        ('Shoulder-to-Overhead',             'shoulder-to-overhead',             'Press',             'strength',       ARRAY['weight','reps'],            true, 'push'),
        ('Kettlebell Press',                 'kettlebell-press',                 'Press',             'strength',       ARRAY['weight','reps'],            true, 'push'),
        ('Kettlebell Push Press',            'kettlebell-push-press',            'Push Press',        'strength',       ARRAY['weight','reps'],            true, 'push'),
        ('Dumbbell Shoulder Press',          'dumbbell-shoulder-press',          'Press',             'strength',       ARRAY['weight','reps'],            true, 'push'),
        ('Dumbbell Push Press',              'dumbbell-push-press',              'Push Press',        'strength',       ARRAY['weight','reps'],            true, 'push'),
        ('Dumbbell Bench Press',             'dumbbell-bench-press',             'Bench Press',       'strength',       ARRAY['weight','reps'],            true, 'push'),

        -- Pull / row
        ('Sumo Deadlift High Pull',          'sumo-deadlift-high-pull',          'Deadlift',          'strength',       ARRAY['weight','reps'],            true, 'pull'),
        ('Bent Over Row',                    'bent-over-row',                    'Row',               'strength',       ARRAY['weight','reps'],            true, 'pull'),
        ('Pendlay Row',                      'pendlay-row',                      'Row',               'strength',       ARRAY['weight','reps'],            true, 'pull'),
        ('Dumbbell Row',                     'dumbbell-row',                     'Row',               'strength',       ARRAY['weight','reps'],            true, 'pull'),

        -- Compound CF staples
        ('Thruster',                         'thruster',                         'Thruster',          'strength',       ARRAY['weight','reps'],            true, 'push'),
        ('Dumbbell Thruster',                'dumbbell-thruster',                'Thruster',          'strength',       ARRAY['weight','reps'],            true, 'push'),
        ('Wall Ball',                        'wall-ball',                        'Wall Ball',         'strength',       ARRAY['weight','reps'],            true, 'legs'),
        ('Ground-to-Overhead',               'ground-to-overhead',               'Ground-to-Overhead','strength',       ARRAY['weight','reps'],            true, 'conditioning'),
        ('Medicine Ball Clean',              'medicine-ball-clean',              'Clean',             'strength',       ARRAY['reps'],                     true, 'conditioning'),
        ('Medicine Ball Slam',               'medicine-ball-slam',               'Slam',              'strength',       ARRAY['weight','reps'],            true, 'conditioning'),

        -- Lunge family
        ('Dumbbell Lunge',                   'dumbbell-lunge',                   'Lunge',             'strength',       ARRAY['weight','reps'],            true, 'legs'),
        ('Dumbbell Reverse Lunge',           'dumbbell-reverse-lunge',           'Lunge',             'strength',       ARRAY['weight','reps'],            true, 'legs'),
        ('Barbell Walking Lunge',            'barbell-walking-lunge',            'Lunge',             'strength',       ARRAY['weight','reps'],            true, 'legs'),
        ('Overhead Barbell Walking Lunge',   'overhead-barbell-walking-lunge',   'Lunge',             'strength',       ARRAY['weight','reps'],            true, 'legs'),
        ('Dumbbell Overhead Walking Lunge',  'dumbbell-overhead-walking-lunge',  'Lunge',             'strength',       ARRAY['weight','reps'],            true, 'legs'),
        ('Dumbbell Box Step-Up',             'dumbbell-box-step-up',             'Box Step',          'strength',       ARRAY['weight','reps'],            true, 'legs'),

        -- Kettlebell
        ('Kettlebell Swing',                 'kettlebell-swing',                 'Kettlebell Swing',  'strength',       ARRAY['weight','reps'],            true, 'legs'),
        ('American Kettlebell Swing',        'american-kettlebell-swing',        'Kettlebell Swing',  'strength',       ARRAY['weight','reps'],            true, 'legs'),
        ('Single Arm Kettlebell Swing',      'single-arm-kettlebell-swing',      'Kettlebell Swing',  'strength',       ARRAY['weight','reps'],            true, 'legs'),
        ('Kettlebell Clean',                 'kettlebell-clean',                 'Clean',             'strength',       ARRAY['weight','reps'],            true, 'legs'),
        ('Kettlebell Turkish Get-Up',        'kettlebell-turkish-get-up',        'Turkish Get-Up',    'strength',       ARRAY['weight','reps'],            true, 'core'),
        ('Kettlebell Windmill',              'kettlebell-windmill',              'Windmill',          'strength',       ARRAY['weight','reps'],            true, 'core'),

        -- Open staples
        ('Devil Press',                      'devil-press',                      'Devil Press',       'strength',       ARRAY['weight','reps'],            true, 'conditioning'),
        ('Dumbbell Hang Squat Clean',        'dumbbell-hang-squat-clean',        'Clean',             'strength',       ARRAY['weight','reps'],            true, 'legs'),

        -- ── WEIGHTLIFTING (32) ───────────────────────────────────────────────────

        -- Clean family
        ('Clean',                            'clean',                            'Clean',             'weightlifting',  ARRAY['weight','reps'],            true, 'legs'),
        ('Power Clean',                      'power-clean',                      'Clean',             'weightlifting',  ARRAY['weight','reps'],            true, 'legs'),
        ('Hang Clean',                       'hang-clean',                       'Clean',             'weightlifting',  ARRAY['weight','reps'],            true, 'legs'),
        ('Hang Power Clean',                 'hang-power-clean',                 'Clean',             'weightlifting',  ARRAY['weight','reps'],            true, 'legs'),
        ('High Hang Clean',                  'high-hang-clean',                  'Clean',             'weightlifting',  ARRAY['weight','reps'],            true, 'legs'),
        ('High Hang Power Clean',            'high-hang-power-clean',            'Clean',             'weightlifting',  ARRAY['weight','reps'],            true, 'legs'),
        ('Clean Pull',                       'clean-pull',                       'Clean',             'weightlifting',  ARRAY['weight','reps'],            true, 'legs'),
        ('Clean Deadlift',                   'clean-deadlift',                   'Clean',             'weightlifting',  ARRAY['weight','reps'],            true, 'legs'),
        ('Muscle Clean',                     'muscle-clean',                     'Clean',             'weightlifting',  ARRAY['weight','reps'],            true, 'push'),
        ('Dumbbell Hang Power Clean',        'dumbbell-hang-power-clean',        'Clean',             'weightlifting',  ARRAY['weight','reps'],            true, 'legs'),

        -- Clean and Jerk / Jerk family
        ('Clean and Jerk',                   'clean-and-jerk',                   'Clean',             'weightlifting',  ARRAY['weight','reps'],            true, 'legs'),
        ('Push Jerk',                        'push-jerk',                        'Jerk',              'weightlifting',  ARRAY['weight','reps'],            true, 'push'),
        ('Split Jerk',                       'split-jerk',                       'Jerk',              'weightlifting',  ARRAY['weight','reps'],            true, 'push'),
        ('Power Jerk',                       'power-jerk',                       'Jerk',              'weightlifting',  ARRAY['weight','reps'],            true, 'push'),
        ('Jerk Balance',                     'jerk-balance',                     'Jerk',              'weightlifting',  ARRAY['weight','reps'],            true, 'push'),
        ('Dumbbell Clean and Jerk',          'dumbbell-clean-and-jerk',          'Clean and Jerk',    'weightlifting',  ARRAY['weight','reps'],            true, 'legs'),
        ('Dumbbell Push Jerk',               'dumbbell-push-jerk',               'Jerk',              'weightlifting',  ARRAY['weight','reps'],            true, 'push'),

        -- Snatch family
        ('Snatch',                           'snatch',                           'Snatch',            'weightlifting',  ARRAY['weight','reps'],            true, 'legs'),
        ('Power Snatch',                     'power-snatch',                     'Snatch',            'weightlifting',  ARRAY['weight','reps'],            true, 'legs'),
        ('Hang Snatch',                      'hang-snatch',                      'Snatch',            'weightlifting',  ARRAY['weight','reps'],            true, 'legs'),
        ('Hang Power Snatch',                'hang-power-snatch',                'Snatch',            'weightlifting',  ARRAY['weight','reps'],            true, 'legs'),
        ('High Hang Snatch',                 'high-hang-snatch',                 'Snatch',            'weightlifting',  ARRAY['weight','reps'],            true, 'legs'),
        ('High Hang Power Snatch',           'high-hang-power-snatch',           'Snatch',            'weightlifting',  ARRAY['weight','reps'],            true, 'legs'),
        ('Snatch Pull',                      'snatch-pull',                      'Snatch',            'weightlifting',  ARRAY['weight','reps'],            true, 'legs'),
        ('Snatch Deadlift',                  'snatch-deadlift',                  'Snatch',            'weightlifting',  ARRAY['weight','reps'],            true, 'legs'),
        ('Muscle Snatch',                    'muscle-snatch',                    'Snatch',            'weightlifting',  ARRAY['weight','reps'],            true, 'push'),
        ('Snatch Balance',                   'snatch-balance',                   'Snatch',            'weightlifting',  ARRAY['weight','reps'],            true, 'push'),
        ('Drop Snatch',                      'drop-snatch',                      'Snatch',            'weightlifting',  ARRAY['weight','reps'],            true, 'push'),
        ('Dumbbell Snatch',                  'dumbbell-snatch',                  'Snatch',            'weightlifting',  ARRAY['weight','reps'],            true, 'legs'),
        ('Kettlebell Snatch',                'kettlebell-snatch',                'Snatch',            'weightlifting',  ARRAY['weight','reps'],            true, 'legs'),

        -- Overhead accessory
        ('Behind the Neck Press',            'behind-the-neck-press',            'Press',             'weightlifting',  ARRAY['weight','reps'],            true, 'push'),
        ('Snatch Grip Push Press',           'snatch-grip-push-press',           'Push Press',        'weightlifting',  ARRAY['weight','reps'],            true, 'push'),

        -- ── GYMNASTICS (55) ──────────────────────────────────────────────────────

        -- Pull-Up family
        ('Pull-Up',                          'pull-up',                          'Pull-Up',           'gymnastics',     ARRAY['reps'],                     true, 'pull'),
        ('Strict Pull-Up',                   'strict-pull-up',                   'Pull-Up',           'gymnastics',     ARRAY['reps'],                     true, 'pull'),
        ('Kipping Pull-Up',                  'kipping-pull-up',                  'Pull-Up',           'gymnastics',     ARRAY['reps'],                     true, 'pull'),
        ('Butterfly Pull-Up',                'butterfly-pull-up',                'Pull-Up',           'gymnastics',     ARRAY['reps'],                     true, 'pull'),
        ('Chest-to-Bar Pull-Up',             'chest-to-bar-pull-up',             'Pull-Up',           'gymnastics',     ARRAY['reps'],                     true, 'pull'),
        ('Weighted Pull-Up',                 'weighted-pull-up',                 'Pull-Up',           'gymnastics',     ARRAY['weight','reps'],            true, 'pull'),

        -- Muscle-Up family
        ('Bar Muscle-Up',                    'bar-muscle-up',                    'Muscle-Up',         'gymnastics',     ARRAY['reps'],                     true, 'pull'),
        ('Ring Muscle-Up',                   'ring-muscle-up',                   'Muscle-Up',         'gymnastics',     ARRAY['reps'],                     true, 'pull'),
        ('Strict Bar Muscle-Up',             'strict-bar-muscle-up',             'Muscle-Up',         'gymnastics',     ARRAY['reps'],                     true, 'pull'),
        ('Strict Ring Muscle-Up',            'strict-ring-muscle-up',            'Muscle-Up',         'gymnastics',     ARRAY['reps'],                     true, 'pull'),

        -- Handstand Push-Up family
        ('Handstand Push-Up',                'handstand-push-up',                'Handstand Push-Up', 'gymnastics',     ARRAY['reps'],                     true, 'push'),
        ('Strict Handstand Push-Up',         'strict-handstand-push-up',         'Handstand Push-Up', 'gymnastics',     ARRAY['reps'],                     true, 'push'),
        ('Kipping Handstand Push-Up',        'kipping-handstand-push-up',        'Handstand Push-Up', 'gymnastics',     ARRAY['reps'],                     true, 'push'),
        ('Deficit Handstand Push-Up',        'deficit-handstand-push-up',        'Handstand Push-Up', 'gymnastics',     ARRAY['height','reps'],            true, 'push'),

        -- Push family
        ('Push-Up',                          'push-up',                          'Push-Up',           'gymnastics',     ARRAY['reps'],                     true, 'push'),
        ('Ring Push-Up',                     'ring-push-up',                     'Push-Up',           'gymnastics',     ARRAY['reps'],                     true, 'push'),
        ('Pike Push-Up',                     'pike-push-up',                     'Push-Up',           'gymnastics',     ARRAY['reps'],                     true, 'push'),
        ('Ring Dip',                         'ring-dip',                         'Dip',               'gymnastics',     ARRAY['reps'],                     true, 'push'),
        ('Bar Dip',                          'bar-dip',                          'Dip',               'gymnastics',     ARRAY['reps'],                     true, 'push'),
        ('Strict Ring Dip',                  'strict-ring-dip',                  'Dip',               'gymnastics',     ARRAY['reps'],                     true, 'push'),
        ('Ring Support Hold',                'ring-support-hold',                'Dip',               'gymnastics',     ARRAY['time'],                     true, 'push'),

        -- Core hanging
        ('Toes-to-Bar',                      'toes-to-bar',                      'Toes-to-Bar',       'gymnastics',     ARRAY['reps'],                     true, 'core'),
        ('Strict Toes-to-Bar',               'strict-toes-to-bar',               'Toes-to-Bar',       'gymnastics',     ARRAY['reps'],                     true, 'core'),
        ('Knees-to-Elbows',                  'knees-to-elbows',                  'Toes-to-Bar',       'gymnastics',     ARRAY['reps'],                     true, 'core'),
        ('Hanging Knee Raise',               'hanging-knee-raise',               'Toes-to-Bar',       'gymnastics',     ARRAY['reps'],                     true, 'core'),

        -- Rope climb
        ('Rope Climb',                       'rope-climb',                       'Rope Climb',        'gymnastics',     ARRAY['reps'],                     true, 'pull'),
        ('Legless Rope Climb',               'legless-rope-climb',               'Rope Climb',        'gymnastics',     ARRAY['reps'],                     true, 'pull'),
        ('Pegboard Climb',                   'pegboard-climb',                   'Pegboard',          'gymnastics',     ARRAY['reps','time'],              true, 'pull'),

        -- Handstand skill
        ('Handstand Walk',                   'handstand-walk',                   'Handstand',         'gymnastics',     ARRAY['distance'],                 true, 'push'),
        ('Wall Walk',                        'wall-walk',                        'Handstand',         'gymnastics',     ARRAY['reps'],                     true, 'push'),
        ('Handstand Hold',                   'handstand-hold',                   'Handstand',         'gymnastics',     ARRAY['time'],                     true, 'core'),

        -- Ring skills
        ('Skin the Cat',                     'skin-the-cat',                     'Skin the Cat',      'gymnastics',     ARRAY['reps'],                     true, 'pull'),
        ('Front Lever',                      'front-lever',                      'Lever',             'gymnastics',     ARRAY['time'],                     true, 'pull'),
        ('Back Lever',                       'back-lever',                       'Lever',             'gymnastics',     ARRAY['time'],                     true, 'pull'),
        ('Ring Row',                         'ring-row',                         'Row',               'gymnastics',     ARRAY['reps'],                     true, 'pull'),

        -- Squat / lower body bodyweight
        ('Air Squat',                        'air-squat',                        'Squat',             'gymnastics',     ARRAY['reps'],                     true, 'legs'),
        ('Pistol Squat',                     'pistol-squat',                     'Squat',             'gymnastics',     ARRAY['reps'],                     true, 'legs'),
        ('Lunge',                            'lunge',                            'Lunge',             'gymnastics',     ARRAY['reps'],                     true, 'legs'),
        ('Walking Lunge',                    'walking-lunge',                    'Lunge',             'gymnastics',     ARRAY['reps','distance'],          true, 'legs'),
        ('Box Step-Up',                      'box-step-up',                      'Step-Up',           'gymnastics',     ARRAY['reps'],                     true, 'legs'),

        -- Core floor
        ('GHD Sit-Up',                       'ghd-sit-up',                       'Sit-Up',            'gymnastics',     ARRAY['reps'],                     true, 'core'),
        ('GHD Back Extension',               'ghd-back-extension',               'Back Extension',    'gymnastics',     ARRAY['reps'],                     true, 'core'),
        ('GHD Hip Extension',                'ghd-hip-extension',                'GHD',               'gymnastics',     ARRAY['reps'],                     true, 'core'),
        ('AbMat Sit-Up',                     'abmat-sit-up',                     'Sit-Up',            'gymnastics',     ARRAY['reps'],                     true, 'core'),
        ('V-Up',                             'v-up',                             'Sit-Up',            'gymnastics',     ARRAY['reps'],                     true, 'core'),
        ('Hollow Rock',                      'hollow-rock',                      'Hollow',            'gymnastics',     ARRAY['reps'],                     true, 'core'),
        ('Hollow Hold',                      'hollow-hold',                      'Hollow',            'gymnastics',     ARRAY['time'],                     true, 'core'),
        ('L-Sit',                            'l-sit',                            'L-Sit',             'gymnastics',     ARRAY['time'],                     true, 'core'),
        ('Ring L-Sit',                       'ring-l-sit',                       'L-Sit',             'gymnastics',     ARRAY['time'],                     true, 'core'),
        ('Arch Hold',                        'arch-hold',                        'Arch',              'gymnastics',     ARRAY['time'],                     true, 'core'),
        ('Superman',                         'superman',                         'Superman',          'gymnastics',     ARRAY['reps'],                     true, 'core'),
        ('Plank Hold',                       'plank-hold',                       'Plank',             'gymnastics',     ARRAY['time'],                     true, 'core'),
        ('Bear Crawl',                       'bear-crawl',                       'Bear Crawl',        'gymnastics',     ARRAY['time','distance'],          true, 'core'),

        -- Jump rope
        ('Double Under',                     'double-under',                     'Jump Rope',         'gymnastics',     ARRAY['reps'],                     true, 'conditioning'),
        ('Single Under',                     'single-under',                     'Jump Rope',         'gymnastics',     ARRAY['reps'],                     true, 'conditioning'),

        -- ── MONO-STRUCTURAL (9) ──────────────────────────────────────────────────

        ('Row',                              'row',                              'Row',               'mono_structural',ARRAY['distance','time'],          true, 'conditioning'),
        ('Run',                              'run',                              'Run',               'mono_structural',ARRAY['distance','time'],          true, 'conditioning'),
        ('Assault Bike',                     'assault-bike',                     'Bike',              'mono_structural',ARRAY['calories','distance','time'],true, 'conditioning'),
        ('Echo Bike',                        'echo-bike',                        'Bike',              'mono_structural',ARRAY['calories','distance','time'],true, 'conditioning'),
        ('Bike Erg',                         'bike-erg',                         'Bike',              'mono_structural',ARRAY['calories','distance','time'],true, 'conditioning'),
        ('Ski Erg',                          'ski-erg',                          'Ski',               'mono_structural',ARRAY['calories','distance','time'],true, 'conditioning'),
        ('Swim',                             'swim',                             'Swim',              'mono_structural',ARRAY['distance','time'],          true, 'conditioning'),
        ('Walk',                             'walk',                             'Walk',              'mono_structural',ARRAY['distance','time'],          true, 'conditioning'),
        ('Ruck',                             'ruck',                             'Ruck',              'mono_structural',ARRAY['distance','time'],          true, 'conditioning'),

        -- ── PLYOMETRIC (14) ──────────────────────────────────────────────────────

        ('Box Jump',                         'box-jump',                         'Box Jump',          'plyometric',     ARRAY['reps'],                     true, 'legs'),
        ('Box Jump Over',                    'box-jump-over',                    'Box Jump',          'plyometric',     ARRAY['reps'],                     true, 'legs'),
        ('Lateral Box Jump',                 'lateral-box-jump',                 'Box Jump',          'plyometric',     ARRAY['height','reps'],            true, 'legs'),
        ('Box Step-Over',                    'box-step-over',                    'Box',               'plyometric',     ARRAY['reps'],                     true, 'legs'),
        ('Dumbbell Box Step-Over',           'dumbbell-box-step-over',           'Box',               'plyometric',     ARRAY['weight','reps'],            true, 'legs'),
        ('Burpee',                           'burpee',                           'Burpee',            'plyometric',     ARRAY['reps'],                     true, 'conditioning'),
        ('Bar-Facing Burpee',                'bar-facing-burpee',                'Burpee',            'plyometric',     ARRAY['reps'],                     true, 'conditioning'),
        ('Burpee Box Jump Over',             'burpee-box-jump-over',             'Burpee',            'plyometric',     ARRAY['reps'],                     true, 'conditioning'),
        ('Lateral Burpee',                   'lateral-burpee',                   'Burpee',            'plyometric',     ARRAY['reps'],                     true, 'conditioning'),
        ('Broad Jump',                       'broad-jump',                       'Jump',              'plyometric',     ARRAY['reps','distance'],          true, 'legs'),
        ('Tuck Jump',                        'tuck-jump',                        'Jump',              'plyometric',     ARRAY['reps'],                     true, 'legs'),
        ('Jump Lunge',                       'jump-lunge',                       'Lunge',             'plyometric',     ARRAY['reps'],                     true, 'legs'),
        ('Jump Squat',                       'jump-squat',                       'Squat',             'plyometric',     ARRAY['reps'],                     true, 'legs'),
        ('Depth Jump',                       'depth-jump',                       'Jump',              'plyometric',     ARRAY['height','reps'],            true, 'legs'),

        -- ── CARRY (16) ───────────────────────────────────────────────────────────

        ('Farmer Carry',                     'farmer-carry',                     'Carry',             'carry',          ARRAY['distance','time'],          true, 'conditioning'),
        ('Single Arm Farmer Carry',          'single-arm-farmer-carry',          'Carry',             'carry',          ARRAY['weight','distance','time'], true, 'core'),
        ('Suitcase Carry',                   'suitcase-carry',                   'Carry',             'carry',          ARRAY['weight','distance','time'], true, 'core'),
        ('Rack Carry',                       'rack-carry',                       'Carry',             'carry',          ARRAY['weight','distance','time'], true, 'push'),
        ('Overhead Carry',                   'overhead-carry',                   'Carry',             'carry',          ARRAY['distance','time'],          true, 'push'),
        ('Waiter Walk',                      'waiter-walk',                      'Carry',             'carry',          ARRAY['distance','time'],          true, 'push'),
        ('Plate Pinch Carry',                'plate-pinch-carry',                'Carry',             'carry',          ARRAY['distance','time'],          true, 'pull'),
        ('Yoke Carry',                       'yoke-carry',                       'Carry',             'carry',          ARRAY['distance','time'],          true, 'legs'),
        ('Sled Push',                        'sled-push',                        'Sled',              'carry',          ARRAY['distance','time'],          true, 'legs'),
        ('Sled Pull',                        'sled-pull',                        'Sled',              'carry',          ARRAY['distance','time'],          true, 'pull'),
        ('Sandbag Carry',                    'sandbag-carry',                    'Carry',             'carry',          ARRAY['distance','time'],          true, 'conditioning'),
        ('Sandbag Shoulder Carry',           'sandbag-shoulder-carry',           'Carry',             'carry',          ARRAY['weight','distance','time'], true, 'core'),
        ('Zercher Carry',                    'zercher-carry',                    'Carry',             'carry',          ARRAY['weight','distance','time'], true, 'core'),
        ('Bear Hug Carry',                   'bear-hug-carry',                   'Carry',             'carry',          ARRAY['weight','distance','time'], true, 'core'),
        ('Husafell Carry',                   'husafell-carry',                   'Carry',             'carry',          ARRAY['weight','distance','time'], true, 'conditioning'),
        ('Keg Carry',                        'keg-carry',                        'Keg',               'carry',          ARRAY['weight','distance','time'], true, 'conditioning'),

        -- ── STRONGMAN (12) ───────────────────────────────────────────────────────

        ('Atlas Stone',                      'atlas-stone',                      'Stone',             'strongman',      ARRAY['reps'],                     true, 'legs'),
        ('Stone to Shoulder',                'stone-to-shoulder',                'Stone',             'strongman',      ARRAY['reps'],                     true, 'legs'),
        ('Stone to Platform',                'stone-to-platform',                'Stone',             'strongman',      ARRAY['weight','reps'],            true, 'legs'),
        ('D-Ball Over Shoulder',             'd-ball-over-shoulder',             'D-Ball',            'strongman',      ARRAY['weight','reps'],            true, 'legs'),
        ('Tire Flip',                        'tire-flip',                        'Tire Flip',         'strongman',      ARRAY['reps'],                     true, 'legs'),
        ('Sandbag to Shoulder',              'sandbag-to-shoulder',              'Sandbag',           'strongman',      ARRAY['reps'],                     true, 'legs'),
        ('Sandbag Clean',                    'sandbag-clean',                    'Sandbag',           'strongman',      ARRAY['weight','reps'],            true, 'legs'),
        ('Log Press',                        'log-press',                        'Press',             'strongman',      ARRAY['weight','reps'],            true, 'push'),
        ('Log Clean and Press',              'log-clean-and-press',              'Log',               'strongman',      ARRAY['weight','reps'],            true, 'push'),
        ('Axle Bar Deadlift',                'axle-bar-deadlift',                'Deadlift',          'strongman',      ARRAY['weight','reps'],            true, 'legs'),
        ('Axle Bar Press',                   'axle-bar-press',                   'Press',             'strongman',      ARRAY['weight','reps'],            true, 'push'),
        ('Keg Lift',                         'keg-lift',                         'Keg',               'strongman',      ARRAY['weight','reps'],            true, 'legs')

    ON CONFLICT (slug) DO NOTHING;
  END IF;
END;
$$;
