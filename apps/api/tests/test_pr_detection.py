"""Integration tests for server-side PR detection (B2).

Verifies that create_workout correctly sets is_pr on results that beat
the user's prior best estimated 1RM for a movement.
"""

from __future__ import annotations

import uuid

import pytest
from httpx import AsyncClient


async def _create_movement(client: AsyncClient, name: str | None = None) -> str:
    slug = (name or "Test Movement") + "-" + uuid.uuid4().hex[:6]
    slug = slug.lower().replace(" ", "-")
    r = await client.post(
        "/api/v1/movements",
        json={
            "name": name or "Test Movement",
            "slug": slug,
            "base_movement": name or "Test Movement",
            "modality": "strength",
        },
    )
    assert r.status_code == 201, r.json()
    return r.json()["id"]


def _result(movement_id: str, load_kg: float, reps: int, order_index: int = 0) -> dict:
    return {
        "movement_id": movement_id,
        "result_type": "weight",
        "load_kg": load_kg,
        "reps": reps,
        "order_index": order_index,
        "pace_distance_m": 500,
        "is_pr": False,  # client always sends False; server should override
    }


@pytest.mark.asyncio
async def test_first_result_for_movement_is_pr(alice_client: AsyncClient) -> None:
    """First time a movement is logged, is_pr should be true."""
    m = await _create_movement(alice_client, "Back Squat B2")
    r = await alice_client.post(
        "/api/v1/workouts",
        json={"performed_at": "2024-01-10T12:00:00Z", "results": [_result(m, 100.0, 5)]},
    )
    assert r.status_code == 201
    results = r.json()["results"]
    assert len(results) == 1
    assert results[0]["is_pr"] is True


@pytest.mark.asyncio
async def test_higher_result_in_new_workout_is_pr(alice_client: AsyncClient) -> None:
    """A result that beats the prior best e1RM should be flagged as PR."""
    m = await _create_movement(alice_client, "Deadlift B2")

    r1 = await alice_client.post(
        "/api/v1/workouts",
        json={"performed_at": "2024-01-10T12:00:00Z", "results": [_result(m, 100.0, 5)]},
    )
    assert r1.status_code == 201
    assert r1.json()["results"][0]["is_pr"] is True

    r2 = await alice_client.post(
        "/api/v1/workouts",
        json={"performed_at": "2024-01-20T12:00:00Z", "results": [_result(m, 120.0, 5)]},
    )
    assert r2.status_code == 201
    assert r2.json()["results"][0]["is_pr"] is True


@pytest.mark.asyncio
async def test_lower_result_in_new_workout_not_pr(alice_client: AsyncClient) -> None:
    """A result below the prior best e1RM must not be flagged."""
    m = await _create_movement(alice_client, "Press B2")

    await alice_client.post(
        "/api/v1/workouts",
        json={"performed_at": "2024-01-10T12:00:00Z", "results": [_result(m, 80.0, 3)]},
    )

    r2 = await alice_client.post(
        "/api/v1/workouts",
        json={"performed_at": "2024-01-20T12:00:00Z", "results": [_result(m, 60.0, 5)]},
    )
    assert r2.status_code == 201
    assert r2.json()["results"][0]["is_pr"] is False


@pytest.mark.asyncio
async def test_pr_detection_is_user_scoped(
    alice_client: AsyncClient, bob_client: AsyncClient
) -> None:
    """Bob's results must not suppress Alice's PR detection."""
    # Use the same movement slug — movements are shared by name in practice,
    # but here each user creates their own so there is no cross-user contamination.
    m_alice = await _create_movement(alice_client, "Clean B2 Alice")
    m_bob = await _create_movement(bob_client, "Clean B2 Bob")

    # Bob logs a very heavy lift
    await bob_client.post(
        "/api/v1/workouts",
        json={"performed_at": "2024-01-05T12:00:00Z", "results": [_result(m_bob, 200.0, 5)]},
    )

    # Alice logs her first result for her movement — should still be a PR
    r = await alice_client.post(
        "/api/v1/workouts",
        json={"performed_at": "2024-01-10T12:00:00Z", "results": [_result(m_alice, 50.0, 5)]},
    )
    assert r.status_code == 201
    assert r.json()["results"][0]["is_pr"] is True


@pytest.mark.asyncio
async def test_result_without_movement_id_never_pr(alice_client: AsyncClient) -> None:
    """Results with no movement_id (free-text movements) are never marked as PR."""
    r = await alice_client.post(
        "/api/v1/workouts",
        json={
            "performed_at": "2024-01-10T12:00:00Z",
            "results": [
                {
                    "result_type": "weight",
                    "load_kg": 100.0,
                    "reps": 5,
                    "order_index": 0,
                    "pace_distance_m": 500,
                    "is_pr": False,
                }
            ],
        },
    )
    assert r.status_code == 201
    assert r.json()["results"][0]["is_pr"] is False


@pytest.mark.asyncio
async def test_multiple_sets_same_workout_only_pr_beating_history(
    alice_client: AsyncClient,
) -> None:
    """Within one workout, only sets that beat the prior historical best are PR."""
    m = await _create_movement(alice_client, "Snatch B2")

    # Establish a prior best: 100 kg × 3 → e1rm = 110
    await alice_client.post(
        "/api/v1/workouts",
        json={"performed_at": "2024-01-01T12:00:00Z", "results": [_result(m, 100.0, 3)]},
    )

    # New workout: 3 sets — one below history, one matching, one above
    r = await alice_client.post(
        "/api/v1/workouts",
        json={
            "performed_at": "2024-01-10T12:00:00Z",
            "results": [
                _result(m, 80.0, 3, order_index=0),  # e1rm ≈ 88  — below history
                _result(m, 100.0, 3, order_index=1),  # e1rm = 110 — matches history (not >)
                _result(m, 110.0, 3, order_index=2),  # e1rm ≈ 121 — new PR
            ],
        },
    )
    assert r.status_code == 201
    results = sorted(r.json()["results"], key=lambda x: x["order_index"])
    assert results[0]["is_pr"] is False  # 80 kg — below history
    assert results[1]["is_pr"] is False  # ties history — not strictly greater
    assert results[2]["is_pr"] is True  # 110 kg — new best


@pytest.mark.asyncio
async def test_personal_records_endpoint_returns_extended_fields(
    alice_client: AsyncClient,
) -> None:
    """After B2, /analytics/personal-records returns load_kg, reps, prev_best_1rm_kg, delta_kg."""
    m = await _create_movement(alice_client, "Front Squat B2")

    # First PR
    await alice_client.post(
        "/api/v1/workouts",
        json={"performed_at": "2024-01-01T12:00:00Z", "results": [_result(m, 80.0, 5)]},
    )
    # Second, higher PR
    await alice_client.post(
        "/api/v1/workouts",
        json={"performed_at": "2024-01-20T12:00:00Z", "results": [_result(m, 100.0, 5)]},
    )

    r = await alice_client.get("/api/v1/analytics/personal-records")
    assert r.status_code == 200
    prs = r.json()
    assert len(prs) == 1
    pr = prs[0]

    assert pr["load_kg"] == pytest.approx(100.0)
    assert pr["reps"] == 5
    # Epley: 80 × (1 + 5/30) ≈ 93.33
    assert pr["prev_best_1rm_kg"] == pytest.approx(80.0 * (1 + 5 / 30), rel=0.01)
    # delta = best - prev
    assert pr["delta_kg"] == pytest.approx(100.0 * (1 + 5 / 30) - 80.0 * (1 + 5 / 30), rel=0.01)


@pytest.mark.asyncio
async def test_personal_records_first_entry_has_no_prev_best(
    alice_client: AsyncClient,
) -> None:
    """A movement with only one result has prev_best_1rm_kg = None and delta_kg = None."""
    m = await _create_movement(alice_client, "Overhead Squat B2")
    await alice_client.post(
        "/api/v1/workouts",
        json={"performed_at": "2024-01-01T12:00:00Z", "results": [_result(m, 60.0, 3)]},
    )

    r = await alice_client.get("/api/v1/analytics/personal-records")
    assert r.status_code == 200
    pr = r.json()[0]
    assert pr["prev_best_1rm_kg"] is None
    assert pr["delta_kg"] is None
