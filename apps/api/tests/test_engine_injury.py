"""Unit tests for injury engine logic (pure functions, no DB needed)."""

from __future__ import annotations

from app.engine.injury import CONTRAINDICATIONS, union_contraindications


def test_referral_injury_blocks_all_movements() -> None:
    result = union_contraindications([("shoulder", True)])
    assert set(result.keys()) == set(CONTRAINDICATIONS.keys())


def test_non_referral_injury_blocks_only_region() -> None:
    result = union_contraindications([("shoulder", False)])
    shoulder_movements = set(CONTRAINDICATIONS.get("shoulder", []))
    assert set(result.keys()) == shoulder_movements
    for movement in CONTRAINDICATIONS.get("lower_back", []):
        assert movement not in result


def test_mixed_injuries_referral_dominates() -> None:
    result = union_contraindications([("shoulder", False), ("lower_back", True)])
    # The referral injury should block everything
    assert set(result.keys()) == set(CONTRAINDICATIONS.keys())


def test_empty_injuries_returns_empty() -> None:
    assert union_contraindications([]) == {}
