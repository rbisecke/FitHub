"""Safety classifier — fully deterministic, no LLM. STOP tier never calls the LLM."""

from __future__ import annotations

import re
from enum import StrEnum


class SafetyTier(StrEnum):
    COACH = "coach"
    MODIFY = "modify"
    STOP = "stop"


STOP_PATTERNS: list[str] = [
    r"\bchest pain\b",
    r"\bheart (attack|palpitations?)\b",
    r"\bbone\b.{0,30}\bsticking out\b",
    r"\bcan'?t breathe\b",
    r"\bshortness of breath\b",
    r"\bblack(ing)? out\b",
    r"\bpass(ing|ed) out\b",
    r"\bsevere (pain|swelling)\b",
    r"\btore (my |the )?(acl|lcl|mcl|pcl|rotator|labrum)\b",
    r"\bdisloc(at|ated)\b",
    r"\bstarv(ing|ation)\b",
    r"\bpurg(ing|e)\b",
    r"\bself.harm\b",
    r"\bsuicid\w+\b",
]

MODIFY_PATTERNS: list[str] = [
    r"\binjur(y|ed|ies)\b",
    r"\bhurt(s|ing)?\b",
    r"\bpain\b",
    r"\bsore(ness)?\b",
    r"\bache\b",
    r"\bswollen\b",
    r"\bstiff(ness)?\b",
    r"\bpregnant\b",
    r"\bpregnanc\w+\b",
    r"\bdiabet(ic|es)\b",
    r"\bhypertension\b",
    r"\bblood pressure\b",
]


def classify_safety(text: str) -> tuple[SafetyTier, str | None]:
    lower = text.lower()
    for pattern in STOP_PATTERNS:
        if re.search(pattern, lower):
            return SafetyTier.STOP, pattern
    for pattern in MODIFY_PATTERNS:
        if re.search(pattern, lower):
            return SafetyTier.MODIFY, pattern
    return SafetyTier.COACH, None


def numeric_crosscheck(text: str) -> str | None:
    lower = text.lower()
    warnings: list[str] = []

    hr_match = re.search(r"\b(heart rate|hr|bpm)\b.*?(\d{3,})", lower)
    if hr_match and int(hr_match.group(2)) > 220:
        warnings.append(f"Heart rate {hr_match.group(2)} bpm is physiologically unusual.")

    wl_match = re.search(r"(\d+)\s*(lb|pound|kg).*?(per|a)\s*week", lower)
    if wl_match:
        val = float(wl_match.group(1))
        unit = wl_match.group(2)
        kg = val * 0.453592 if "lb" in unit or "pound" in unit else val
        if kg > 2.0:
            warnings.append(f"Stated weight loss rate ({val} {unit}/week) is unsafe.")

    return "; ".join(warnings) if warnings else None
