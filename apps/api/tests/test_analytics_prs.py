"""Integration tests for personal-records and movement-trend endpoints."""

from __future__ import annotations

import pytest
from httpx import AsyncClient

_SQUAT_RESULT = {
    "result_type": "weight",
    "load_kg": 100.0,
    "reps": 5,
    "order_index": 0,
    "pace_distance_m": 500,
    "is_pr": False,
}


async def _create_movement(client: AsyncClient, name: str = "Back Squat PR Test") -> str:
    import uuid as _uuid

    slug = name.lower().replace(" ", "-") + "-" + _uuid.uuid4().hex[:6]
    r = await client.post(
        "/api/v1/movements",
        json={"name": name, "slug": slug, "base_movement": name, "modality": "strength"},
    )
    assert r.status_code == 201, r.json()
    return r.json()["id"]


@pytest.mark.asyncio
async def test_prs_no_results(alice_client: AsyncClient) -> None:
    r = await alice_client.get("/api/v1/analytics/personal-records")
    assert r.status_code == 200
    assert r.json() == []


@pytest.mark.asyncio
async def test_prs_single_result(alice_client: AsyncClient) -> None:
    movement_id = await _create_movement(alice_client)
    result = {**_SQUAT_RESULT, "movement_id": movement_id}
    await alice_client.post(
        "/api/v1/workouts",
        json={"performed_at": "2024-01-10T12:00:00Z", "results": [result]},
    )

    r = await alice_client.get("/api/v1/analytics/personal-records")
    assert r.status_code == 200
    prs = r.json()
    assert len(prs) == 1
    assert prs[0]["movement_name"] == "Back Squat PR Test"
    assert prs[0]["best_1rm_kg"] > 0


@pytest.mark.asyncio
async def test_prs_returns_highest_e1rm(alice_client: AsyncClient) -> None:
    movement_id = await _create_movement(alice_client)
    low_result = {**_SQUAT_RESULT, "movement_id": movement_id, "load_kg": 80.0, "reps": 5}
    high_result = {**_SQUAT_RESULT, "movement_id": movement_id, "load_kg": 120.0, "reps": 5}

    await alice_client.post(
        "/api/v1/workouts",
        json={"performed_at": "2024-01-10T12:00:00Z", "results": [low_result]},
    )
    await alice_client.post(
        "/api/v1/workouts",
        json={"performed_at": "2024-01-20T12:00:00Z", "results": [high_result]},
    )

    r = await alice_client.get("/api/v1/analytics/personal-records")
    assert r.status_code == 200
    prs = r.json()
    assert len(prs) == 1
    # Epley for 120kg x 5 reps = 120 * (1 + 5/30) = 140
    assert prs[0]["best_1rm_kg"] == pytest.approx(140.0, rel=0.01)


@pytest.mark.asyncio
async def test_prs_two_movements(alice_client: AsyncClient) -> None:
    m1_id = await _create_movement(alice_client, "Deadlift PR Test")
    m2_id = await _create_movement(alice_client, "Press PR Test")

    await alice_client.post(
        "/api/v1/workouts",
        json={
            "performed_at": "2024-01-10T12:00:00Z",
            "results": [
                {**_SQUAT_RESULT, "movement_id": m1_id, "load_kg": 150.0},
                {**_SQUAT_RESULT, "movement_id": m2_id, "load_kg": 70.0, "order_index": 1},
            ],
        },
    )

    r = await alice_client.get("/api/v1/analytics/personal-records")
    assert r.status_code == 200
    assert len(r.json()) == 2


@pytest.mark.asyncio
async def test_movement_trend_ordered_asc(alice_client: AsyncClient) -> None:
    movement_id = await _create_movement(alice_client)
    for i, load in enumerate([80.0, 100.0, 110.0]):
        result = {**_SQUAT_RESULT, "movement_id": movement_id, "load_kg": load}
        await alice_client.post(
            "/api/v1/workouts",
            json={
                "performed_at": f"2024-0{i + 1}-10T12:00:00Z",
                "results": [result],
            },
        )

    r = await alice_client.get(f"/api/v1/analytics/movement-trend/{movement_id}")
    assert r.status_code == 200
    points = r.json()
    assert len(points) == 3
    e1rms = [p["estimated_1rm_kg"] for p in points]
    assert e1rms == sorted(e1rms)


@pytest.mark.asyncio
async def test_prs_scoped_by_implement_variant(alice_client: AsyncClient) -> None:
    """Barbell and dumbbell variants of one movement are separate PR rows (04 §2A, BG-23)."""
    movement_id = await _create_movement(alice_client, "Bench Variant Test")
    barbell = {
        **_SQUAT_RESULT,
        "movement_id": movement_id,
        "load_kg": 100.0,
        "implement": "barbell",
    }
    dumbbell = {
        **_SQUAT_RESULT,
        "movement_id": movement_id,
        "load_kg": 40.0,
        "implement": "dumbbell",
        "order_index": 1,
    }
    await alice_client.post(
        "/api/v1/workouts",
        json={"performed_at": "2024-01-10T12:00:00Z", "results": [barbell, dumbbell]},
    )

    r = await alice_client.get("/api/v1/analytics/personal-records")
    assert r.status_code == 200
    prs = [p for p in r.json() if p["movement_name"] == "Bench Variant Test"]
    assert len(prs) == 2
    by_implement = {p["implement"]: p for p in prs}
    assert set(by_implement) == {"barbell", "dumbbell"}
    assert by_implement["barbell"]["best_1rm_kg"] > by_implement["dumbbell"]["best_1rm_kg"]


@pytest.mark.asyncio
async def test_prs_variant_delta_not_polluted_by_other_variant(alice_client: AsyncClient) -> None:
    """delta_kg/prev_best_1rm_kg for one variant must not derive from another variant's history."""
    movement_id = await _create_movement(alice_client, "Press Variant Delta Test")
    # Dumbbell: two increasing results, so it has its own real prev-best history.
    await alice_client.post(
        "/api/v1/workouts",
        json={
            "performed_at": "2024-01-01T12:00:00Z",
            "results": [
                {
                    **_SQUAT_RESULT,
                    "movement_id": movement_id,
                    "load_kg": 20.0,
                    "implement": "dumbbell",
                }
            ],
        },
    )
    await alice_client.post(
        "/api/v1/workouts",
        json={
            "performed_at": "2024-01-15T12:00:00Z",
            "results": [
                {
                    **_SQUAT_RESULT,
                    "movement_id": movement_id,
                    "load_kg": 30.0,
                    "implement": "dumbbell",
                }
            ],
        },
    )
    # Barbell: single, much heavier result logged after both dumbbell entries.
    await alice_client.post(
        "/api/v1/workouts",
        json={
            "performed_at": "2024-01-20T12:00:00Z",
            "results": [
                {
                    **_SQUAT_RESULT,
                    "movement_id": movement_id,
                    "load_kg": 100.0,
                    "implement": "barbell",
                }
            ],
        },
    )

    r = await alice_client.get("/api/v1/analytics/personal-records")
    assert r.status_code == 200
    prs = [p for p in r.json() if p["movement_name"] == "Press Variant Delta Test"]
    by_implement = {p["implement"]: p for p in prs}

    # Barbell is its own first-ever result — no prev best, no delta — even
    # though a much heavier-e1RM-than-its-own-prior dumbbell history exists.
    assert by_implement["barbell"]["prev_best_1rm_kg"] is None
    assert by_implement["barbell"]["delta_kg"] is None
    # Dumbbell's prev best is its own earlier 20kg entry, not the 100kg barbell lift.
    epley_20 = 20.0 * (1 + 5 / 30)
    assert by_implement["dumbbell"]["prev_best_1rm_kg"] == pytest.approx(epley_20, rel=0.01)


@pytest.mark.asyncio
async def test_prs_trend_projection_not_polluted_by_other_variant(
    alice_client: AsyncClient,
) -> None:
    """OLS regression for one variant must not mix in another variant's data points (04 §2A)."""
    from datetime import date as _date

    from app.engine.strength import project_e1rm

    movement_id = await _create_movement(alice_client, "Squat Trend Variant Test")
    barbell_loads_dates = [
        (80.0, "2024-01-01T12:00:00Z"),
        (90.0, "2024-02-01T12:00:00Z"),
        (100.0, "2024-03-01T12:00:00Z"),
    ]
    # Dumbbell: heavier in absolute e1RM but trending sharply downward — if
    # this pollutes the barbell regression, barbell's current_e1rm_kg will
    # diverge from the barbell-only-computed expectation below.
    dumbbell_loads_dates = [
        (60.0, "2024-01-01T12:00:00Z"),
        (50.0, "2024-02-01T12:00:00Z"),
        (40.0, "2024-03-01T12:00:00Z"),
    ]

    for load, dt in barbell_loads_dates:
        await alice_client.post(
            "/api/v1/workouts",
            json={
                "performed_at": dt,
                "results": [
                    {
                        **_SQUAT_RESULT,
                        "movement_id": movement_id,
                        "load_kg": load,
                        "implement": "barbell",
                    }
                ],
            },
        )
    for load, dt in dumbbell_loads_dates:
        await alice_client.post(
            "/api/v1/workouts",
            json={
                "performed_at": dt,
                "results": [
                    {
                        **_SQUAT_RESULT,
                        "movement_id": movement_id,
                        "load_kg": load,
                        "implement": "dumbbell",
                    }
                ],
            },
        )

    r = await alice_client.get("/api/v1/analytics/personal-records")
    assert r.status_code == 200
    prs = [p for p in r.json() if p["movement_name"] == "Squat Trend Variant Test"]
    by_implement = {p["implement"]: p for p in prs}

    def _epley(load: float) -> float:
        return load * (1 + 5 / 30)

    def _points(loads_dates: list[tuple[float, str]]) -> list[tuple[_date, float]]:
        return [
            (_date(int(dt[:4]), int(dt[5:7]), int(dt[8:10])), _epley(load))
            for load, dt in loads_dates
        ]

    expected_barbell = project_e1rm(_points(barbell_loads_dates), _date.today())
    expected_dumbbell = project_e1rm(_points(dumbbell_loads_dates), _date.today())

    assert expected_barbell.current_e1rm_kg is not None
    assert expected_dumbbell.current_e1rm_kg is not None
    # The two independently-computed trends must be meaningfully different
    # (one rising, one falling) — otherwise this test wouldn't actually catch
    # cross-variant contamination.
    assert expected_barbell.current_e1rm_kg != pytest.approx(
        expected_dumbbell.current_e1rm_kg, rel=0.05
    )

    assert by_implement["barbell"]["current_e1rm_kg"] == pytest.approx(
        expected_barbell.current_e1rm_kg, rel=0.01
    )
    assert by_implement["dumbbell"]["current_e1rm_kg"] == pytest.approx(
        expected_dumbbell.current_e1rm_kg, rel=0.01
    )


@pytest.mark.asyncio
async def test_prs_requires_auth(anon_client: AsyncClient) -> None:
    r = await anon_client.get("/api/v1/analytics/personal-records")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_prs_user_scoped(alice_client: AsyncClient, bob_client: AsyncClient) -> None:
    """Bob must never see Alice's PRs, even for a movement Alice created."""
    movement_id = await _create_movement(alice_client, "Scoped PR Isolation Test")
    result = {**_SQUAT_RESULT, "movement_id": movement_id}
    await alice_client.post(
        "/api/v1/workouts",
        json={"performed_at": "2024-01-10T12:00:00Z", "results": [result]},
    )

    r = await bob_client.get("/api/v1/analytics/personal-records")
    assert r.status_code == 200
    assert all(p["movement_name"] != "Scoped PR Isolation Test" for p in r.json())


@pytest.mark.asyncio
async def test_movement_trend_user_scoped(
    alice_client: AsyncClient, bob_client: AsyncClient
) -> None:
    """Bob querying Alice's movement_id gets his own (empty) trend, not hers."""
    movement_id = await _create_movement(alice_client, "Scoped Trend Isolation Test")
    for i, load in enumerate([80.0, 100.0, 110.0]):
        result = {**_SQUAT_RESULT, "movement_id": movement_id, "load_kg": load}
        await alice_client.post(
            "/api/v1/workouts",
            json={"performed_at": f"2024-0{i + 1}-10T12:00:00Z", "results": [result]},
        )

    r = await bob_client.get(f"/api/v1/analytics/movement-trend/{movement_id}")
    assert r.status_code == 200
    assert r.json() == []


@pytest.mark.asyncio
async def test_movement_history_user_scoped(
    alice_client: AsyncClient, bob_client: AsyncClient
) -> None:
    """Bob querying Alice's movement_id gets his own (empty) history, not hers."""
    movement_id = await _create_movement(alice_client, "Scoped History Isolation Test")
    result = {**_SQUAT_RESULT, "movement_id": movement_id, "load_kg": 100.0}
    await alice_client.post(
        "/api/v1/workouts",
        json={"performed_at": "2024-01-10T12:00:00Z", "results": [result]},
    )

    r = await bob_client.get(f"/api/v1/analytics/movement-history/{movement_id}")
    assert r.status_code == 200
    assert r.json() == []


# --- Strength intelligence fields ---


@pytest.mark.asyncio
async def test_prs_strength_intel_null_when_fewer_than_3_points(
    alice_client: AsyncClient,
) -> None:
    """With fewer than 3 data points, current_e1rm_kg and projection are null."""
    movement_id = await _create_movement(alice_client, "OHS Strength Intel Test")
    result = {**_SQUAT_RESULT, "movement_id": movement_id, "load_kg": 60.0, "reps": 5}
    await alice_client.post(
        "/api/v1/workouts",
        json={"performed_at": "2024-03-01T12:00:00Z", "results": [result]},
    )

    r = await alice_client.get("/api/v1/analytics/personal-records")
    assert r.status_code == 200
    prs = r.json()
    pr = next(p for p in prs if p["movement_name"] == "OHS Strength Intel Test")
    assert pr["current_e1rm_kg"] is None
    assert pr["next_pr_kg"] is None
    assert pr["next_pr_weeks"] is None


@pytest.mark.asyncio
async def test_prs_strength_intel_populated_with_3_points(
    alice_client: AsyncClient,
) -> None:
    """With 3+ data points on an upward trend, current_e1rm_kg is returned."""
    movement_id = await _create_movement(alice_client, "Clean Strength Intel Test")
    loads = [80.0, 90.0, 100.0]
    dates = ["2024-01-01T12:00:00Z", "2024-02-01T12:00:00Z", "2024-03-01T12:00:00Z"]
    for load, dt in zip(loads, dates, strict=False):
        result = {**_SQUAT_RESULT, "movement_id": movement_id, "load_kg": load, "reps": 5}
        await alice_client.post(
            "/api/v1/workouts",
            json={"performed_at": dt, "results": [result]},
        )

    r = await alice_client.get("/api/v1/analytics/personal-records")
    assert r.status_code == 200
    prs = r.json()
    pr = next(p for p in prs if p["movement_name"] == "Clean Strength Intel Test")
    # Upward trend with 3 points: current_e1rm_kg must be populated
    assert pr["current_e1rm_kg"] is not None
    assert pr["current_e1rm_kg"] > 0
    # is_stale must reflect that the last session was in March 2024 (long ago)
    assert pr["is_stale"] is True


@pytest.mark.asyncio
async def test_movement_history_requires_auth(anon_client: AsyncClient) -> None:
    import uuid

    r = await anon_client.get(f"/api/v1/analytics/movement-history/{uuid.uuid4()}")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_movement_history_empty_when_no_results(alice_client: AsyncClient) -> None:
    """Returns an empty list, not 404, when no sets have been logged."""
    import uuid

    r = await alice_client.get(f"/api/v1/analytics/movement-history/{uuid.uuid4()}")
    assert r.status_code == 200
    assert r.json() == []


@pytest.mark.asyncio
async def test_movement_history_returns_sets_newest_first(alice_client: AsyncClient) -> None:
    movement_id = await _create_movement(alice_client, "Snatch History Test")
    loads_and_dates = [
        (80.0, "2024-01-10T12:00:00Z"),
        (90.0, "2024-02-10T12:00:00Z"),
        (100.0, "2024-03-10T12:00:00Z"),
    ]
    for load, dt in loads_and_dates:
        result = {**_SQUAT_RESULT, "movement_id": movement_id, "load_kg": load, "reps": 3}
        await alice_client.post("/api/v1/workouts", json={"performed_at": dt, "results": [result]})

    r = await alice_client.get(f"/api/v1/analytics/movement-history/{movement_id}")
    assert r.status_code == 200
    entries = r.json()
    assert len(entries) == 3
    # newest-first ordering
    dates = [e["date"] for e in entries]
    assert dates == sorted(dates, reverse=True)
    # PR row is the highest e1RM set
    pr_rows = [e for e in entries if e["is_pr"]]
    assert len(pr_rows) == 1
    assert pr_rows[0]["load_kg"] == pytest.approx(100.0)


@pytest.mark.asyncio
async def test_movement_history_scoped_by_implement(alice_client: AsyncClient) -> None:
    """The (movement, implement, side) key isolates variant history (01 §9.1, BG-26)."""
    movement_id = await _create_movement(alice_client, "Bench Scope Test")
    barbell = {
        **_SQUAT_RESULT,
        "movement_id": movement_id,
        "load_kg": 100.0,
        "implement": "barbell",
    }
    dumbbell = {
        **_SQUAT_RESULT,
        "movement_id": movement_id,
        "load_kg": 40.0,
        "implement": "dumbbell",
    }
    await alice_client.post(
        "/api/v1/workouts",
        json={
            "performed_at": "2024-01-10T12:00:00Z",
            "results": [barbell, {**dumbbell, "order_index": 1}],
        },
    )

    unscoped = await alice_client.get(f"/api/v1/analytics/movement-history/{movement_id}")
    assert len(unscoped.json()) == 2

    scoped = await alice_client.get(
        f"/api/v1/analytics/movement-history/{movement_id}",
        params={"implement": "dumbbell"},
    )
    assert scoped.status_code == 200
    rows = scoped.json()
    assert len(rows) == 1
    assert rows[0]["load_kg"] == pytest.approx(40.0)


@pytest.mark.asyncio
async def test_movement_history_scoped_by_side(alice_client: AsyncClient) -> None:
    """The `side` dimension isolates unilateral variant history (01 §9.1, BG-26)."""
    movement_id = await _create_movement(alice_client, "Lunge Side Test")
    left = {**_SQUAT_RESULT, "movement_id": movement_id, "load_kg": 30.0, "side": "left"}
    right = {**_SQUAT_RESULT, "movement_id": movement_id, "load_kg": 35.0, "side": "right"}
    await alice_client.post(
        "/api/v1/workouts",
        json={
            "performed_at": "2024-01-10T12:00:00Z",
            "results": [left, {**right, "order_index": 1}],
        },
    )

    scoped = await alice_client.get(
        f"/api/v1/analytics/movement-history/{movement_id}",
        params={"side": "right"},
    )
    assert scoped.status_code == 200
    rows = scoped.json()
    assert len(rows) == 1
    assert rows[0]["load_kg"] == pytest.approx(35.0)


@pytest.mark.asyncio
async def test_movement_trend_scoped_by_implement(alice_client: AsyncClient) -> None:
    """Trend re-scopes to the selected implement (01 §9.1, BG-26)."""
    movement_id = await _create_movement(alice_client, "Press Scope Test")
    await alice_client.post(
        "/api/v1/workouts",
        json={
            "performed_at": "2024-01-10T12:00:00Z",
            "results": [
                {
                    **_SQUAT_RESULT,
                    "movement_id": movement_id,
                    "load_kg": 60.0,
                    "implement": "barbell",
                },
                {
                    **_SQUAT_RESULT,
                    "movement_id": movement_id,
                    "load_kg": 24.0,
                    "implement": "dumbbell",
                    "order_index": 1,
                },
            ],
        },
    )

    scoped = await alice_client.get(
        f"/api/v1/analytics/movement-trend/{movement_id}",
        params={"implement": "barbell"},
    )
    assert scoped.status_code == 200
    points = scoped.json()
    assert len(points) == 1
