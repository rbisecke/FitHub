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


class TestChronicRegions:
    def test_it_band_red_flag_keyword_not_triggered(self) -> None:
        assert has_red_flags("my IT band tore up during the run", 5, "it_band") is False

    def test_it_band_high_pain_still_triggers(self) -> None:
        assert has_red_flags(None, 8, "it_band") is True

    def test_hip_flexor_red_flag_keyword_not_triggered(self) -> None:
        assert has_red_flags("it popped", 4, "hip_flexor") is False

    def test_forearm_red_flag_keyword_not_triggered(self) -> None:
        assert has_red_flags("snapped my forearm tendon", 6, "forearm") is False

    def test_non_chronic_region_still_triggers(self) -> None:
        assert has_red_flags("I tore my hamstring", 4, "hamstring") is True

    def test_body_region_defaults_empty_string_backward_compat(self) -> None:
        assert has_red_flags("it popped", 4) is True


class TestNewRegions:
    def test_hamstring_has_deadlift_contraindicated(self) -> None:
        assert "deadlift" in get_contraindicated_movements("hamstring")

    def test_hamstring_has_sprint_contraindicated(self) -> None:
        assert "sprint" in get_contraindicated_movements("hamstring")

    def test_hamstring_deadlift_has_substitutions(self) -> None:
        subs = resolve_substitution("hamstring", "deadlift")
        assert len(subs) > 0
        assert any("Trap Bar" in s for s in subs)

    def test_hamstring_rdl_has_substitutions(self) -> None:
        assert len(resolve_substitution("hamstring", "romanian_deadlift")) > 0

    def test_quad_has_front_squat_contraindicated(self) -> None:
        assert "front_squat" in get_contraindicated_movements("quad")

    def test_calf_has_double_under_contraindicated(self) -> None:
        assert "double_under" in get_contraindicated_movements("calf")

    def test_calf_running_has_substitutions(self) -> None:
        assert len(resolve_substitution("calf", "running")) > 0

    def test_forearm_deadlift_returns_straps_option(self) -> None:
        subs = resolve_substitution("forearm", "deadlift")
        assert any("straps" in s.lower() for s in subs)

    def test_forearm_pullup_returns_straps_option(self) -> None:
        subs = resolve_substitution("forearm", "pull_up")
        assert any("straps" in s.lower() for s in subs)

    def test_it_band_has_running_contraindicated(self) -> None:
        assert "running" in get_contraindicated_movements("it_band")

    def test_it_band_running_has_substitutions(self) -> None:
        assert len(resolve_substitution("it_band", "running")) > 0

    def test_hip_flexor_has_toes_to_bar_contraindicated(self) -> None:
        assert "toes_to_bar" in get_contraindicated_movements("hip_flexor")

    def test_lat_has_pull_up_contraindicated(self) -> None:
        assert "pull_up" in get_contraindicated_movements("lat")

    def test_chest_has_pushup_contraindicated(self) -> None:
        assert "pushup" in get_contraindicated_movements("chest")

    def test_bicep_has_pull_up_contraindicated(self) -> None:
        assert "pull_up" in get_contraindicated_movements("bicep")

    def test_tricep_has_dip_contraindicated(self) -> None:
        assert "dip" in get_contraindicated_movements("tricep")

    def test_glute_has_hip_thrust_contraindicated(self) -> None:
        assert "hip_thrust" in get_contraindicated_movements("glute")

    def test_upper_back_has_deadlift_contraindicated(self) -> None:
        assert "deadlift" in get_contraindicated_movements("upper_back")
