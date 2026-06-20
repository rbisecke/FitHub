"""Unit tests for injury engine — deterministic, no DB needed."""

from __future__ import annotations

from app.engine.injury import (
    RED_FLAG_PATTERNS,
    get_contraindicated_movements,
    has_red_flags,
    resolve_substitution,
)


class TestRedFlags:
    def test_pain_8_is_red_flag(self) -> None:
        assert has_red_flags(None, 8) is True

    def test_pain_10_is_red_flag(self) -> None:
        assert has_red_flags(None, 10) is True

    def test_pain_7_not_red_flag_without_keywords(self) -> None:
        assert has_red_flags("my knee hurts a bit", 7) is False

    def test_tore_keyword_is_red_flag(self) -> None:
        assert has_red_flags("I think I tore something", 4) is True

    def test_popped_keyword_is_red_flag(self) -> None:
        assert has_red_flags("it popped when I landed", 3) is True

    def test_numbness_keyword_is_red_flag(self) -> None:
        assert has_red_flags("numbness in fingers", 5) is True

    def test_none_notes_no_red_flag_at_low_pain(self) -> None:
        assert has_red_flags(None, 3) is False

    def test_locked_keyword_is_red_flag(self) -> None:
        assert has_red_flags("my knee locked up", 4) is True

    def test_all_red_flag_patterns_are_strings(self) -> None:
        assert all(isinstance(p, str) for p in RED_FLAG_PATTERNS)

    def test_locked_up_phrase_triggers(self) -> None:
        assert has_red_flags("heard a pop and it locked up", 5) is True


class TestSubstitution:
    def test_knee_squat_returns_alternatives(self) -> None:
        subs = resolve_substitution("knee", "air_squat")
        assert len(subs) > 0

    def test_unknown_movement_returns_empty(self) -> None:
        assert resolve_substitution("knee", "interpretive_dance") == []

    def test_unknown_region_returns_empty(self) -> None:
        assert resolve_substitution("pinky_toe", "deadlift") == []

    def test_shoulder_pullup_has_alternatives(self) -> None:
        subs = resolve_substitution("shoulder", "pull_up")
        assert len(subs) > 0

    def test_lower_back_deadlift_has_alternatives(self) -> None:
        subs = resolve_substitution("lower_back", "deadlift")
        assert len(subs) > 0

    def test_movement_name_normalised_spaces(self) -> None:
        subs = resolve_substitution("knee", "air squat")
        assert len(subs) > 0


class TestContraindicated:
    def test_shoulder_has_overhead_movements(self) -> None:
        movements = get_contraindicated_movements("shoulder")
        assert "overhead_squat" in movements

    def test_knee_has_squat_movements(self) -> None:
        movements = get_contraindicated_movements("knee")
        assert "air_squat" in movements

    def test_unknown_region_empty(self) -> None:
        assert get_contraindicated_movements("alien_limb") == []

    def test_lower_back_has_deadlift(self) -> None:
        assert "deadlift" in get_contraindicated_movements("lower_back")
