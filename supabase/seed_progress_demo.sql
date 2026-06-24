-- Demo seed for /analytics (progress) page visual validation
-- Targets: local Supabase, user b5ad9d98-1520-4f9c-a344-3f9a2304f1a6 (e2e-qa)
-- Run: supabase db query --local --file supabase/seed_progress_demo.sql

DO $$
DECLARE
  uid  uuid := 'b5ad9d98-1520-4f9c-a344-3f9a2304f1a6';
  bsq  uuid := '93f265f3-58e5-415c-a06d-566cff155355'; -- Back Squat
  dl   uuid := '52a77276-4e9c-4bad-bc20-18389227ed98'; -- Deadlift
  bp   uuid := '050753e2-05f6-4c6a-809f-8b68de012d99'; -- Bench Press
  cl   uuid := '7f51c3bb-b010-4f56-b455-4029e45da81f'; -- Clean
  fran_id uuid;
  wid  uuid;
BEGIN

-- ── 1. Fran benchmark ────────────────────────────────────────────────────────
INSERT INTO benchmarks (name, description)
VALUES ('Fran', '21-15-9: Thrusters (43/30 kg), Pull-ups. For time.')
ON CONFLICT (name) DO NOTHING;
SELECT id INTO fran_id FROM benchmarks WHERE name = 'Fran';

-- ── 2. Strength workouts with Back Squat e1rm progression ────────────────────
-- Each row: (date, perceived_load_au, volume_load_kg, bsq_e1rm)

wid := gen_random_uuid();
INSERT INTO workouts (id, user_id, performed_at, short_hash, session_type, workout_format, perceived_load_au, volume_load_kg)
VALUES (wid, uid, '2026-03-26 07:00:00+00', 'a1b2c3d4', 'strength', 'strength', 320, 9200);
INSERT INTO results (user_id, workout_id, movement_id, result_type, load_kg, reps, estimated_1rm_kg, set_index, is_pr)
VALUES (uid, wid, bsq, 'weight', 80.0, 5, 100.0, 1, false),
       (uid, wid, bsq, 'weight', 80.0, 5, 100.0, 2, false),
       (uid, wid, bsq, 'weight', 80.0, 5, 100.0, 3, false),
       (uid, wid, dl,  'weight', 120.0, 3, 135.0, 1, false);

wid := gen_random_uuid();
INSERT INTO workouts (id, user_id, performed_at, short_hash, session_type, workout_format, perceived_load_au, volume_load_kg)
VALUES (wid, uid, '2026-04-03 07:00:00+00', 'b2c3d4e5', 'strength', 'strength', 350, 9800);
INSERT INTO results (user_id, workout_id, movement_id, result_type, load_kg, reps, estimated_1rm_kg, set_index, is_pr)
VALUES (uid, wid, bsq, 'weight', 82.5, 5, 102.5, 1, false),
       (uid, wid, bsq, 'weight', 82.5, 5, 102.5, 2, false),
       (uid, wid, bsq, 'weight', 82.5, 5, 102.5, 3, false),
       (uid, wid, bp,  'weight', 65.0, 5, 80.0, 1, false);

wid := gen_random_uuid();
INSERT INTO workouts (id, user_id, performed_at, short_hash, session_type, workout_format, perceived_load_au, volume_load_kg)
VALUES (wid, uid, '2026-04-17 07:00:00+00', 'c3d4e5f6', 'strength', 'strength', 360, 10100);
INSERT INTO results (user_id, workout_id, movement_id, result_type, load_kg, reps, estimated_1rm_kg, set_index, is_pr)
VALUES (uid, wid, bsq, 'weight', 85.0, 5, 105.0, 1, false),
       (uid, wid, bsq, 'weight', 85.0, 5, 105.0, 2, false),
       (uid, wid, bsq, 'weight', 85.0, 5, 105.0, 3, false),
       (uid, wid, bp,  'weight', 67.5, 5, 82.5, 1, false);

wid := gen_random_uuid();
INSERT INTO workouts (id, user_id, performed_at, short_hash, session_type, workout_format, perceived_load_au, volume_load_kg)
VALUES (wid, uid, '2026-04-25 07:00:00+00', 'd4e5f6a7', 'strength', 'strength', 380, 10500);
INSERT INTO results (user_id, workout_id, movement_id, result_type, load_kg, reps, estimated_1rm_kg, set_index, is_pr)
VALUES (uid, wid, bsq, 'weight', 87.5, 5, 108.0, 1, false),
       (uid, wid, bsq, 'weight', 87.5, 5, 108.0, 2, false),
       (uid, wid, bsq, 'weight', 90.0, 3, 108.0, 3, false),
       (uid, wid, dl,  'weight', 130.0, 3, 146.0, 1, false);

wid := gen_random_uuid();
INSERT INTO workouts (id, user_id, performed_at, short_hash, session_type, workout_format, perceived_load_au, volume_load_kg)
VALUES (wid, uid, '2026-05-03 07:00:00+00', 'e5f6a7b8', 'strength', 'strength', 390, 10800);
INSERT INTO results (user_id, workout_id, movement_id, result_type, load_kg, reps, estimated_1rm_kg, set_index, is_pr)
VALUES (uid, wid, bsq, 'weight', 90.0, 5, 111.0, 1, false),
       (uid, wid, bsq, 'weight', 90.0, 5, 111.0, 2, false),
       (uid, wid, bsq, 'weight', 90.0, 5, 111.0, 3, false),
       (uid, wid, bp,  'weight', 70.0, 5, 86.0, 1, false);

wid := gen_random_uuid();
INSERT INTO workouts (id, user_id, performed_at, short_hash, session_type, workout_format, perceived_load_au, volume_load_kg)
VALUES (wid, uid, '2026-05-11 07:00:00+00', 'f6a7b8c9', 'strength', 'strength', 400, 11200);
INSERT INTO results (user_id, workout_id, movement_id, result_type, load_kg, reps, estimated_1rm_kg, set_index, is_pr)
VALUES (uid, wid, bsq, 'weight', 92.5, 5, 114.0, 1, false),
       (uid, wid, bsq, 'weight', 92.5, 5, 114.0, 2, false),
       (uid, wid, bsq, 'weight', 92.5, 3, 113.0, 3, false),
       (uid, wid, dl,  'weight', 135.0, 3, 152.0, 1, false);

wid := gen_random_uuid();
INSERT INTO workouts (id, user_id, performed_at, short_hash, session_type, workout_format, perceived_load_au, volume_load_kg)
VALUES (wid, uid, '2026-05-19 07:00:00+00', 'a7b8c9d0', 'strength', 'strength', 410, 11500);
INSERT INTO results (user_id, workout_id, movement_id, result_type, load_kg, reps, estimated_1rm_kg, set_index, is_pr)
VALUES (uid, wid, bsq, 'weight', 95.0, 5, 117.0, 1, false),
       (uid, wid, bsq, 'weight', 95.0, 5, 117.0, 2, false),
       (uid, wid, bsq, 'weight', 95.0, 3, 116.0, 3, false),
       (uid, wid, bp,  'weight', 72.5, 5, 89.0, 1, false);

wid := gen_random_uuid();
INSERT INTO workouts (id, user_id, performed_at, short_hash, session_type, workout_format, perceived_load_au, volume_load_kg)
VALUES (wid, uid, '2026-05-27 07:00:00+00', 'b8c9d0e1', 'strength', 'strength', 420, 11800);
INSERT INTO results (user_id, workout_id, movement_id, result_type, load_kg, reps, estimated_1rm_kg, set_index, is_pr)
VALUES (uid, wid, bsq, 'weight', 97.5, 5, 120.0, 1, false),
       (uid, wid, bsq, 'weight', 97.5, 5, 120.0, 2, false),
       (uid, wid, bsq, 'weight', 97.5, 3, 119.0, 3, false),
       (uid, wid, dl,  'weight', 140.0, 3, 157.0, 1, false);

wid := gen_random_uuid();
INSERT INTO workouts (id, user_id, performed_at, short_hash, session_type, workout_format, perceived_load_au, volume_load_kg)
VALUES (wid, uid, '2026-06-04 07:00:00+00', 'c9d0e1f2', 'strength', 'strength', 440, 12200);
INSERT INTO results (user_id, workout_id, movement_id, result_type, load_kg, reps, estimated_1rm_kg, set_index, is_pr)
VALUES (uid, wid, bsq, 'weight', 100.0, 5, 123.0, 1, false),
       (uid, wid, bsq, 'weight', 100.0, 5, 123.0, 2, false),
       (uid, wid, bsq, 'weight', 100.0, 3, 122.0, 3, false),
       (uid, wid, bp,  'weight', 75.0, 5, 92.0, 1, false);

wid := gen_random_uuid();
INSERT INTO workouts (id, user_id, performed_at, short_hash, session_type, workout_format, perceived_load_au, volume_load_kg)
VALUES (wid, uid, '2026-06-12 07:00:00+00', 'd0e1f2a3', 'strength', 'strength', 450, 12500);
INSERT INTO results (user_id, workout_id, movement_id, result_type, load_kg, reps, estimated_1rm_kg, set_index, is_pr)
VALUES (uid, wid, bsq, 'weight', 102.5, 5, 126.0, 1, true),
       (uid, wid, bsq, 'weight', 102.5, 5, 126.0, 2, false),
       (uid, wid, bsq, 'weight', 102.5, 3, 125.0, 3, false),
       (uid, wid, dl,  'weight', 145.0, 3, 163.0, 1, true);

-- ── 3. Fran benchmark attempts ────────────────────────────────────────────────
wid := gen_random_uuid();
INSERT INTO workouts (id, user_id, performed_at, short_hash, session_type, workout_format, perceived_load_au, benchmark_id)
VALUES (wid, uid, '2026-05-01 07:00:00+00', 'f1a2b3c4', 'metcon', 'benchmark', 380, fran_id);
INSERT INTO results (user_id, workout_id, movement_id, result_type, time_s, is_pr)
VALUES (uid, wid, NULL, 'time', 287, true);

wid := gen_random_uuid();
INSERT INTO workouts (id, user_id, performed_at, short_hash, session_type, workout_format, perceived_load_au, benchmark_id)
VALUES (wid, uid, '2026-05-23 07:00:00+00', 'a2b3c4d5', 'metcon', 'benchmark', 360, fran_id);
INSERT INTO results (user_id, workout_id, movement_id, result_type, time_s, is_pr)
VALUES (uid, wid, NULL, 'time', 254, true);

wid := gen_random_uuid();
INSERT INTO workouts (id, user_id, performed_at, short_hash, session_type, workout_format, perceived_load_au, benchmark_id)
VALUES (wid, uid, '2026-06-10 07:00:00+00', 'b3c4d5e6', 'metcon', 'benchmark', 340, fran_id);
INSERT INTO results (user_id, workout_id, movement_id, result_type, time_s, is_pr)
VALUES (uid, wid, NULL, 'time', 228, true);

-- ── 4. Filler metcon + skill workouts to build CTL curve ─────────────────────
INSERT INTO workouts (user_id, performed_at, short_hash, session_type, workout_format, perceived_load_au, volume_load_kg)
VALUES
-- March
(uid, '2026-03-28 07:00:00+00', 'c4d5e6f7', 'metcon', 'for_time', 280, 0),
(uid, '2026-03-30 07:00:00+00', 'd5e6f7a8', 'strength', 'strength', 300, 7800),
-- April
(uid, '2026-04-01 07:00:00+00', 'e6f7a8b9', 'metcon', 'amrap', 260, 0),
(uid, '2026-04-05 07:00:00+00', 'f7a8b9c0', 'skill', 'emom', 180, 0),
(uid, '2026-04-07 07:00:00+00', 'a8b9c0d1', 'metcon', 'for_time', 290, 0),
(uid, '2026-04-09 07:00:00+00', 'b9c0d1e2', 'strength', 'strength', 340, 9000),
(uid, '2026-04-11 07:00:00+00', 'c0d1e2f3', 'metcon', 'amrap', 250, 0),
(uid, '2026-04-13 07:00:00+00', 'd1e2f3a4', 'skill', 'emom', 190, 0),
(uid, '2026-04-15 07:00:00+00', 'e2f3a4b5', 'strength', 'strength', 330, 8800),
(uid, '2026-04-19 07:00:00+00', 'f3a4b5c6', 'metcon', 'for_time', 270, 0),
(uid, '2026-04-21 07:00:00+00', 'a4b5c6d7', 'strength', 'strength', 350, 9200),
(uid, '2026-04-23 07:00:00+00', 'b5c6d7e8', 'metcon', 'amrap', 240, 0),
(uid, '2026-04-27 07:00:00+00', 'c6d7e8f9', 'skill', 'emom', 170, 0),
(uid, '2026-04-29 07:00:00+00', 'd7e8f9a0', 'strength', 'strength', 370, 9800),
-- May
(uid, '2026-05-05 07:00:00+00', 'e8f9a0b1', 'metcon', 'for_time', 280, 0),
(uid, '2026-05-07 07:00:00+00', 'f9a0b1c2', 'strength', 'strength', 360, 9500),
(uid, '2026-05-09 07:00:00+00', 'a0b1c2d3', 'skill', 'emom', 200, 0),
(uid, '2026-05-13 07:00:00+00', 'b1c2d3e4', 'metcon', 'amrap', 270, 0),
(uid, '2026-05-15 07:00:00+00', 'c2d3e4f5', 'strength', 'strength', 380, 10000),
(uid, '2026-05-17 07:00:00+00', 'd3e4f5a6', 'metcon', 'for_time', 260, 0),
(uid, '2026-05-21 07:00:00+00', 'e4f5a6b7', 'skill', 'emom', 190, 0),
(uid, '2026-05-25 07:00:00+00', 'f5a6b7c8', 'strength', 'strength', 400, 10500),
(uid, '2026-05-29 07:00:00+00', 'a6b7c8d9', 'metcon', 'amrap', 290, 0),
(uid, '2026-05-31 07:00:00+00', 'b7c8d9e0', 'strength', 'strength', 390, 10200),
-- June (before existing data at Jun 13)
(uid, '2026-06-02 07:00:00+00', 'c8d9e0f1', 'metcon', 'for_time', 275, 0),
(uid, '2026-06-06 07:00:00+00', 'd9e0f1a2', 'skill', 'emom', 195, 0),
(uid, '2026-06-08 07:00:00+00', 'e0f1a2b3', 'strength', 'strength', 420, 11000);

RAISE NOTICE 'Seed complete: added 40+ workouts including Back Squat progression, Fran benchmarks';
END $$;
