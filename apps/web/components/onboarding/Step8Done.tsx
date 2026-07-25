"use client";

import type {
  PrimaryGoal,
  EquipmentAccess,
  WeightUnit,
  DistanceUnit,
} from "@/lib/api";
import type { TrainingAge } from "@/lib/types/plans";
import { GOAL_LABELS } from "./Step2Goal";
import { EQUIPMENT_LABELS } from "./Step4Equipment";

const TRAINING_AGE_LABELS: Record<TrainingAge, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

interface Props {
  onFinish: () => void;
  goal: PrimaryGoal | null;
  trainingAge: TrainingAge | null;
  equipment: EquipmentAccess[];
  frequencyTargetDays: number;
  weightUnit: WeightUnit;
  distanceUnit: DistanceUnit;
}

// Curated recap, not an exhaustive field dump (08 §2 step 8) — only the
// choices a member most wants confirmed at a glance.
export function Step8Done({
  onFinish,
  goal,
  trainingAge,
  equipment,
  frequencyTargetDays,
  weightUnit,
  distanceUnit,
}: Props) {
  const equipmentSummary =
    equipment.length === 0
      ? null
      : equipment.includes("none")
        ? "Bodyweight only"
        : equipment.length <= 3
          ? equipment.map((e) => EQUIPMENT_LABELS[e]).join(", ")
          : `${equipment.length} items`;

  const lines = [
    goal ? `Goal: ${GOAL_LABELS[goal]}` : null,
    trainingAge ? `Experience: ${TRAINING_AGE_LABELS[trainingAge]}` : null,
    equipmentSummary ? `Equipment: ${equipmentSummary}` : null,
    `Frequency: ${frequencyTargetDays}x / week`,
    `Units: ${weightUnit} / ${distanceUnit}`,
  ].filter((line): line is string => line !== null);

  return (
    <div className="animate-fadeUp flex flex-1 flex-col items-center justify-center text-center">
      {/* Celebration graphic */}
      <div
        className="animate-popIn mb-6 flex h-20 w-20 items-center justify-center rounded-[22px]"
        style={{
          background: "color-mix(in srgb, var(--accent) 12%, transparent)",
          border: "1.5px solid var(--accent)",
        }}
      >
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      <p className="font-data mb-2 text-[13px] text-[var(--accent)]">
        $ git push origin main
      </p>

      <h2
        className="font-heading mb-3 text-[32px] text-[var(--foreground)]"
        style={{ letterSpacing: "-0.8px" }}
      >
        You&apos;re set up
      </h2>

      <p className="mb-4 max-w-[320px] text-[14px] leading-[1.6] text-[var(--muted)]">
        Your fitness repo is initialized. Time to start logging — every workout
        is a <span style={{ color: "var(--accent)" }}>commit</span>.
      </p>

      {/* Terminal summary */}
      <div
        className="font-data mb-3 w-full rounded-xl border p-4 text-left text-[12px] text-[var(--muted)]"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
      >
        {lines.map((line) => (
          <p key={line} className="mt-1 first:mt-0">
            <span style={{ color: "var(--accent)" }}>✓</span> {line}
          </p>
        ))}
      </div>

      <p className="mb-10 text-[12px] text-[var(--muted)]">
        You can change these anytime in Settings.
      </p>

      <button
        onClick={onFinish}
        className="w-full rounded-[13px] py-[15px] text-[15px] font-extrabold text-[var(--bg)] transition-opacity hover:opacity-90 active:scale-[0.98]"
        style={{ background: "var(--accent)" }}
      >
        Go to dashboard →
      </button>
    </div>
  );
}
