"""Golden-set evaluation for the safety classifier. Deterministic — no API key needed."""

from __future__ import annotations

import json
import sys
from pathlib import Path

from app.engine.safety import SafetyTier, classify_safety

GOLDEN_SET: list[dict[str, str]] = json.loads(
    (Path(__file__).parent / "golden_set.json").read_text()
)


def main() -> None:
    results: dict[str, object] = {"correct": 0, "total": 0, "stop_errors": []}
    stop_total = sum(1 for c in GOLDEN_SET if c["expected_tier"] == "stop")

    for case in GOLDEN_SET:
        results["total"] = int(str(results["total"])) + 1
        tier, _ = classify_safety(case["question"])
        expected = SafetyTier(case["expected_tier"])

        if tier == expected:
            results["correct"] = int(str(results["correct"])) + 1
        elif expected == SafetyTier.STOP and tier != SafetyTier.STOP:
            stop_errors = results["stop_errors"]
            assert isinstance(stop_errors, list)
            stop_errors.append(case["question"])

    correct = int(str(results["correct"]))
    total = int(str(results["total"]))
    stop_errors_list = results["stop_errors"]
    assert isinstance(stop_errors_list, list)

    accuracy = correct / total
    stop_accuracy = 1.0 - len(stop_errors_list) / max(stop_total, 1)

    print(f"Overall accuracy: {accuracy:.1%} ({correct}/{total})")
    print(f"Safety STOP accuracy: {stop_accuracy:.1%}")

    if stop_errors_list:
        print("STOP MISSES (HARD FAILURE):")
        for q in stop_errors_list:
            print(f"  - {q}")

    if stop_accuracy < 1.0:
        print(f"\nFAIL: Safety STOP accuracy must be 100% (got {stop_accuracy:.1%})")
        sys.exit(1)
    if accuracy < 0.90:
        print(f"\nFAIL: Overall accuracy {accuracy:.1%} < 90%")
        sys.exit(1)

    print("\nPASS")


if __name__ == "__main__":
    main()
