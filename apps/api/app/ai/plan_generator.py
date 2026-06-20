"""Plan generator: LLM-backed (stubbed in test/CI), with async task tracking."""

from __future__ import annotations

from datetime import date, timedelta

import psycopg
import psycopg.rows

from app.ai.stub import stubbed
from app.engine.programming import validate_plan

# ── Stub fixture ──────────────────────────────────────────────────────────────

STUB_PLAN: dict[str, object] = {
    "mesocycles": [
        {
            "name": "Accumulation",
            "phase": "accumulation",
            "week_start": 1,
            "week_end": 6,
            "focus": "Build aerobic base and volume",
        },
        {
            "name": "Deload",
            "phase": "deload",
            "week_start": 7,
            "week_end": 8,
            "focus": "Recovery and consolidation",
        },
    ],
    "weeks": [
        {
            "week": 1,
            "sessions": [
                {
                    "day_offset": 0,
                    "session_type": "strength",
                    "title": "Lower Body Strength",
                    "intensity_level": "hard",
                    "items": [
                        {
                            "movement_name": "Back Squat",
                            "sets": 5,
                            "reps": "5",
                            "load_pct_1rm": 75.0,
                            "movement_pattern": "squat",
                        },
                        {
                            "movement_name": "Romanian Deadlift",
                            "sets": 3,
                            "reps": "8",
                            "load_pct_1rm": 65.0,
                            "movement_pattern": "hinge",
                        },
                    ],
                },
                {
                    "day_offset": 1,
                    "session_type": "metcon",
                    "title": "Monostructural Conditioning",
                    "intensity_level": "hard",
                    "items": [{"movement_name": "Row 5K", "movement_pattern": "locomotion"}],
                },
                {
                    "day_offset": 2,
                    "session_type": "rest",
                    "title": "Rest Day",
                    "intensity_level": "easy",
                    "items": [],
                },
                {
                    "day_offset": 3,
                    "session_type": "strength",
                    "title": "Upper Body Strength",
                    "intensity_level": "hard",
                    "items": [
                        {
                            "movement_name": "Strict Press",
                            "sets": 4,
                            "reps": "5",
                            "load_pct_1rm": 75.0,
                            "movement_pattern": "push_vertical",
                        },
                        {
                            "movement_name": "Pull-up",
                            "sets": 4,
                            "reps": "AMRAP",
                            "movement_pattern": "pull_vertical",
                        },
                    ],
                },
                {
                    "day_offset": 4,
                    "session_type": "active_recovery",
                    "title": "Active Recovery",
                    "intensity_level": "easy",
                    "items": [{"movement_name": "Walk 20min", "movement_pattern": "locomotion"}],
                },
                {
                    "day_offset": 5,
                    "session_type": "metcon",
                    "title": "Mixed Modal",
                    "intensity_level": "hard",
                    "items": [
                        {
                            "movement_name": "Thruster",
                            "sets": 3,
                            "reps": "21-15-9",
                            "movement_pattern": "squat",
                        },
                        {
                            "movement_name": "Pull-up",
                            "sets": 3,
                            "reps": "21-15-9",
                            "movement_pattern": "pull_vertical",
                        },
                    ],
                },
                {
                    "day_offset": 6,
                    "session_type": "rest",
                    "title": "Rest Day",
                    "intensity_level": "easy",
                    "items": [],
                },
            ],
        },
    ],
}


# ── History assembler ─────────────────────────────────────────────────────────


async def build_user_history(
    user_id: str,
    db: psycopg.AsyncConnection[object],
) -> dict[str, object]:
    """Assemble a training history summary for the plan generator prompt."""
    six_weeks_ago = date.today() - timedelta(weeks=6)

    async with db.cursor(row_factory=psycopg.rows.dict_row) as cur:
        await cur.execute(
            """
            SELECT
                w.performed_at::date AS day,
                w.session_type,
                w.session_rpe,
                w.perceived_load_au,
                COALESCE(
                    json_agg(
                        CASE WHEN r.movement_id IS NOT NULL
                             THEN m.name || COALESCE(' ' || r.reps::text, '')
                                  || COALESCE(' @ ' || r.load_kg::text || 'kg', '')
                        END
                    ) FILTER (WHERE r.movement_id IS NOT NULL),
                    '[]'
                ) AS movements
            FROM workouts w
            LEFT JOIN results r ON r.workout_id = w.id
            LEFT JOIN movements m ON m.id = r.movement_id
            WHERE w.user_id = %s AND w.performed_at::date >= %s
            GROUP BY w.id, w.performed_at, w.session_type, w.session_rpe, w.perceived_load_au
            ORDER BY w.performed_at DESC
            LIMIT 42
            """,
            [user_id, six_weeks_ago],
        )
        sessions = await cur.fetchall()

    recent_sessions = [
        {
            "date": str(row["day"]),
            "session_type": row["session_type"],
            "movements": [m for m in (row["movements"] or []) if m],
            "rpe": float(row["session_rpe"]) if row["session_rpe"] else None,
            "perceived_load_au": float(row["perceived_load_au"])
            if row["perceived_load_au"]
            else None,
        }
        for row in sessions
    ]

    # Movement frequency
    movement_freq: dict[str, int] = {}
    for s in recent_sessions:
        for mv in s["movements"]:
            name = str(mv).split(" @")[0].split(" ")[0] if mv else ""
            if name:
                movement_freq[name] = movement_freq.get(name, 0) + 1

    history: dict[str, object] = {
        "recent_sessions": recent_sessions,
        "movement_frequency": dict(sorted(movement_freq.items(), key=lambda x: -x[1])[:10]),
    }

    # Readiness trend (optional — skipped if AI-2 not yet synced)
    async with db.cursor(row_factory=psycopg.rows.dict_row) as cur:
        await cur.execute(
            """
            SELECT recovery_score::float, date
            FROM derived_metrics
            WHERE user_id = %s
            ORDER BY date DESC
            LIMIT 5
            """,
            [user_id],
        )
        dm_rows = await cur.fetchall()

    if dm_rows:
        scores = [float(r["recovery_score"]) for r in dm_rows if r["recovery_score"] is not None]
        history["readiness_trend"] = {
            "recent_scores": scores,
            "28d_mean": sum(scores) / len(scores) if scores else None,
        }

    return history


# ── Generator (stubbed) ───────────────────────────────────────────────────────


@stubbed(STUB_PLAN)
async def generate_plan(
    req: object,
    user_history: dict[str, object],
) -> dict[str, object]:
    raise NotImplementedError("Real LLM plan generation not implemented — run with STUB_LLM=true")


# ── DB helpers ────────────────────────────────────────────────────────────────


async def _create_plan_records(
    user_id: str,
    req_data: dict[str, object],
    draft: dict[str, object],
    db: psycopg.AsyncConnection[object],
) -> str:
    """Persist plan + mesocycles + sessions + items; return plan_id."""

    goal = str(req_data["goal"])
    title = str(req_data["title"])
    start_date_raw = req_data["start_date"]
    weeks = int(str(req_data["weeks"]))
    training_age = str(req_data.get("training_age", "intermediate"))

    if isinstance(start_date_raw, str):
        start_date = date.fromisoformat(start_date_raw)
    elif isinstance(start_date_raw, date):
        start_date = start_date_raw
    else:
        start_date = date.today()

    end_date = start_date + timedelta(weeks=weeks)
    slug = goal.replace("_", "-")
    branch_name = f"plan/{slug}-{start_date.strftime('%Y-%m')}"

    async with db.cursor(row_factory=psycopg.rows.dict_row) as cur:
        await cur.execute(
            """
            INSERT INTO plans (user_id, goal, title, start_date, end_date,
                               branch_name, weeks, training_age)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id::text
            """,
            [user_id, goal, title, start_date, end_date, branch_name, weeks, training_age],
        )
        plan_row = await cur.fetchone()
    plan_id = plan_row["id"]  # type: ignore[index]

    mesocycles_raw = draft.get("mesocycles", [])
    if not isinstance(mesocycles_raw, list):
        mesocycles_raw = []

    meso_id_map: dict[tuple[int, int], str] = {}

    for meso in mesocycles_raw:
        if not isinstance(meso, dict):
            continue
        async with db.cursor(row_factory=psycopg.rows.dict_row) as cur:
            await cur.execute(
                """
                INSERT INTO mesocycles (plan_id, user_id, name, phase, week_start, week_end, focus)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id::text
                """,
                [
                    plan_id,
                    user_id,
                    str(meso.get("name", "Block")),
                    str(meso.get("phase", "accumulation")),
                    int(str(meso.get("week_start", 1))),
                    int(str(meso.get("week_end", 1))),
                    str(meso.get("focus", "")) or None,
                ],
            )
            meso_row = await cur.fetchone()
        meso_id_map[
            (
                int(str(meso.get("week_start", 1))),
                int(str(meso.get("week_end", 1))),
            )
        ] = meso_row["id"]  # type: ignore[index]

    # Pick a mesocycle id for a given week number
    def _meso_for_week(week_num: int) -> str:
        for (ws, we), mid in meso_id_map.items():
            if ws <= week_num <= we:
                return mid
        return next(iter(meso_id_map.values())) if meso_id_map else ""

    weeks_raw = draft.get("weeks", [])
    if not isinstance(weeks_raw, list):
        weeks_raw = []

    for week_data in weeks_raw:
        if not isinstance(week_data, dict):
            continue
        week_num = int(str(week_data.get("week", 1)))
        meso_id = _meso_for_week(week_num)
        if not meso_id:
            continue

        for session in week_data.get("sessions", []):
            if not isinstance(session, dict):
                continue
            day_offset = int(str(session.get("day_offset", 0)))
            sched_date = start_date + timedelta(weeks=week_num - 1, days=day_offset)

            async with db.cursor(row_factory=psycopg.rows.dict_row) as cur:
                await cur.execute(
                    """
                    INSERT INTO planned_sessions
                        (plan_id, mesocycle_id, user_id, scheduled_date,
                         session_type, title, notes)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    RETURNING id::text
                    """,
                    [
                        plan_id,
                        meso_id,
                        user_id,
                        sched_date,
                        str(session.get("session_type", "mixed")),
                        str(session.get("title", "Session")),
                        str(session.get("notes", "")) or None,
                    ],
                )
                sess_row = await cur.fetchone()
            sess_id = sess_row["id"]  # type: ignore[index]

            for order, item in enumerate(session.get("items", [])):
                if not isinstance(item, dict):
                    continue
                async with db.cursor(row_factory=psycopg.rows.dict_row) as cur:
                    await cur.execute(
                        """
                        INSERT INTO planned_items
                            (session_id, user_id, movement_name, sets, reps,
                             load_pct_1rm, load_kg, notes, item_order)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                        """,
                        [
                            sess_id,
                            user_id,
                            str(item.get("movement_name", "Movement")),
                            item.get("sets"),
                            str(item["reps"]) if item.get("reps") is not None else None,
                            item.get("load_pct_1rm"),
                            item.get("load_kg"),
                            str(item.get("notes", "")) or None,
                            order,
                        ],
                    )

    return str(plan_id)


# ── Background task runner ────────────────────────────────────────────────────


async def run_plan_generation(
    task_id: str,
    user_id: str,
    req_data: dict[str, object],
) -> None:
    """Background coroutine: generate plan, persist, update task status."""
    from app.db import pool_connection  # noqa: PLC0415

    pool = pool_connection()
    try:
        async with pool.connection() as db:
            await db.execute(
                "UPDATE plan_tasks SET status='running', updated_at=now() WHERE id=%s",
                [task_id],
            )

            history = await build_user_history(user_id, db)

        # generate_plan may be slow — use a fresh connection after
        draft = await generate_plan(req_data, history)

        # Validate deterministically (errors are non-blocking for stub; LLM path retries internally)
        training_age = str(req_data.get("training_age", "intermediate"))
        validate_plan(draft, training_age)

        async with pool.connection() as db:
            plan_id = await _create_plan_records(user_id, req_data, draft, db)
            await db.execute(
                """
                UPDATE plan_tasks
                SET status='complete', plan_id=%s::uuid, updated_at=now()
                WHERE id=%s
                """,
                [plan_id, task_id],
            )
    except Exception as exc:
        try:
            async with pool.connection() as db:
                await db.execute(
                    "UPDATE plan_tasks SET status='failed', error=%s, updated_at=now() WHERE id=%s",
                    [str(exc)[:500], task_id],
                )
        except Exception:
            pass
