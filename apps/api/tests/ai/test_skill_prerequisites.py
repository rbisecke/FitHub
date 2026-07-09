"""Tests for skill_prerequisites.py — SKILL_PREREQUISITES dict and build_user_history_skill."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.ai.skill_prerequisites import SKILL_PREREQUISITES, build_user_history_skill

# ── Constants ─────────────────────────────────────────────────────────────────

ALL_14_SKILLS = {
    # Tier 1
    "bar-muscle-up",
    "ring-muscle-up",
    "handstand-walk",
    "double-under",
    "kipping-pull-up",
    "toes-to-bar",
    "snatch",
    "clean-and-jerk",
    # Tier 2
    "handstand-push-up-kipping",
    "legless-rope-climb",
    "pistol-squat",
    "overhead-squat",
    "split-jerk",
    "turkish-get-up",
}


# ── SKILL_PREREQUISITES dict tests ────────────────────────────────────────────


def test_all_14_movements_present() -> None:
    assert set(SKILL_PREREQUISITES.keys()) == ALL_14_SKILLS


def test_all_chains_are_non_empty_lists() -> None:
    for skill, chain in SKILL_PREREQUISITES.items():
        assert isinstance(chain, list), f"{skill}: chain is not a list"
        assert len(chain) >= 2, f"{skill}: chain has fewer than 2 entries"


def test_no_self_reference_in_chains() -> None:
    """No skill slug should appear as a value in its own prerequisite chain."""
    for skill, chain in SKILL_PREREQUISITES.items():
        assert skill not in chain, f"{skill}: slug appears in its own prerequisite chain"


def test_chain_values_are_strings() -> None:
    for skill, chain in SKILL_PREREQUISITES.items():
        for item in chain:
            assert isinstance(item, str) and item, (
                f"{skill}: chain contains non-string or empty value: {item!r}"
            )


def test_no_duplicate_entries_within_chain() -> None:
    for skill, chain in SKILL_PREREQUISITES.items():
        assert len(chain) == len(set(chain)), f"{skill}: chain contains duplicate entries"


# ── build_user_history_skill tests ────────────────────────────────────────────


def _make_mock_conn(movement_names: set[str]) -> MagicMock:
    """Build a mock psycopg AsyncConnection that returns the given movement names."""
    rows = [{"name": n} for n in movement_names]

    cursor_cm = AsyncMock()
    cursor_cm.__aenter__ = AsyncMock(return_value=cursor_cm)
    cursor_cm.__aexit__ = AsyncMock(return_value=False)
    cursor_cm.execute = AsyncMock()
    cursor_cm.fetchall = AsyncMock(return_value=rows)

    conn = MagicMock()
    conn.cursor = MagicMock(return_value=cursor_cm)
    return conn


@pytest.mark.asyncio
async def test_build_user_history_skill_returns_dict() -> None:
    """build_user_history_skill must return a dict and not raise with a stub conn."""
    conn = _make_mock_conn(set())
    stub_history: dict[str, object] = {"recent_sessions": [], "movement_frequency": {}}

    with patch(
        "app.ai.skill_prerequisites.build_user_history",
        new=AsyncMock(return_value=stub_history),
    ):
        result = await build_user_history_skill("user-123", conn, "bar-muscle-up")

    assert isinstance(result, dict)
    assert "skill_context" in result


@pytest.mark.asyncio
async def test_entry_point_is_first_unconfirmed() -> None:
    """Entry point is the first prerequisite not yet in the athlete's logged movements."""
    # bar-muscle-up chain: Strict Pull-Up, Chest-to-Bar Pull-Up, Kipping Pull-Up,
    # Kipping Chest-to-Bar Pull-Up, Bar Muscle-Up
    logged = {"Strict Pull-Up", "Chest-to-Bar Pull-Up"}
    conn = _make_mock_conn(logged)
    stub_history: dict[str, object] = {"recent_sessions": [], "movement_frequency": {}}

    with patch(
        "app.ai.skill_prerequisites.build_user_history",
        new=AsyncMock(return_value=stub_history),
    ):
        result = await build_user_history_skill("user-456", conn, "bar-muscle-up")

    sc = result["skill_context"]
    assert isinstance(sc, dict)
    assert sc["current_entry_point"] == "Kipping Pull-Up"
    assert sc["confirmed_prerequisites"] == ["Strict Pull-Up", "Chest-to-Bar Pull-Up"]


@pytest.mark.asyncio
async def test_entry_point_is_last_when_all_confirmed() -> None:
    """When all chain entries are confirmed, entry point is the target skill itself."""
    chain = SKILL_PREREQUISITES["double-under"]
    conn = _make_mock_conn(set(chain))
    stub_history: dict[str, object] = {"recent_sessions": [], "movement_frequency": {}}

    with patch(
        "app.ai.skill_prerequisites.build_user_history",
        new=AsyncMock(return_value=stub_history),
    ):
        result = await build_user_history_skill("user-789", conn, "double-under")

    sc = result["skill_context"]
    assert isinstance(sc, dict)
    assert sc["current_entry_point"] == chain[-1]
    assert set(sc["confirmed_prerequisites"]) == set(chain)  # type: ignore[arg-type]


@pytest.mark.asyncio
async def test_entry_point_is_first_when_nothing_confirmed() -> None:
    """With no history, entry point defaults to the first element in the chain."""
    conn = _make_mock_conn(set())
    stub_history: dict[str, object] = {"recent_sessions": [], "movement_frequency": {}}

    with patch(
        "app.ai.skill_prerequisites.build_user_history",
        new=AsyncMock(return_value=stub_history),
    ):
        result = await build_user_history_skill("user-000", conn, "pistol-squat")

    sc = result["skill_context"]
    assert isinstance(sc, dict)
    assert sc["current_entry_point"] == SKILL_PREREQUISITES["pistol-squat"][0]
    assert sc["confirmed_prerequisites"] == []


@pytest.mark.asyncio
async def test_unknown_skill_returns_base_history_unchanged() -> None:
    """An unrecognised target_skill slug returns base history with no skill_context key."""
    conn = _make_mock_conn(set())
    stub_history: dict[str, object] = {"recent_sessions": [], "movement_frequency": {}}

    with patch(
        "app.ai.skill_prerequisites.build_user_history",
        new=AsyncMock(return_value=stub_history),
    ):
        result = await build_user_history_skill("user-111", conn, "not-a-real-skill")

    assert "skill_context" not in result


@pytest.mark.asyncio
async def test_prerequisite_chain_attached_to_result() -> None:
    """skill_context carries the full prerequisite chain from SKILL_PREREQUISITES."""
    conn = _make_mock_conn(set())
    stub_history: dict[str, object] = {"recent_sessions": [], "movement_frequency": {}}

    with patch(
        "app.ai.skill_prerequisites.build_user_history",
        new=AsyncMock(return_value=stub_history),
    ):
        result = await build_user_history_skill("user-222", conn, "snatch")

    sc = result["skill_context"]
    assert isinstance(sc, dict)
    assert sc["prerequisite_chain"] == SKILL_PREREQUISITES["snatch"]
    assert sc["target_skill"] == "snatch"
