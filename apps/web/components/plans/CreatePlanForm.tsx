"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api/client";
import type { CreatePlanRequest } from "@/lib/api/plans";

const ARCHETYPES: {
  value: CreatePlanRequest["archetype"];
  label: string;
  desc: string;
}[] = [
  {
    value: "general-crossfit",
    label: "General CrossFit",
    desc: "Balanced GPP",
  },
  {
    value: "strength-bias",
    label: "Strength Bias",
    desc: "More barbell, less metcon",
  },
  { value: "aerobic-base", label: "Aerobic Base", desc: "Engine-first" },
  {
    value: "travel-minimal",
    label: "Travel / Minimal",
    desc: "Bodyweight + dumbbells",
  },
  {
    value: "bodyweight-calisthenics",
    label: "Calisthenics",
    desc: "Rings, bars, gymnastics",
  },
  {
    value: "skill-acquisition",
    label: "Skill Acquisition",
    desc: "Specific movement focus",
  },
  { value: "one-rm-peak", label: "1RM Peak", desc: "Peaking for a max lift" },
] as const;

const TRAINING_AGES = [
  { value: "beginner", label: "Beginner", desc: "< 1 year" },
  { value: "intermediate", label: "Intermediate", desc: "1–3 years" },
  { value: "advanced", label: "Advanced", desc: "3+ years" },
] as const;

interface Props {
  accessToken: string;
}

export function CreatePlanForm({ accessToken }: Props) {
  const router = useRouter();
  const cancelledRef = useRef(false);
  useEffect(
    () => () => {
      cancelledRef.current = true;
    },
    [],
  );
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [archetype, setArchetype] = useState<
    CreatePlanRequest["archetype"] | ""
  >("");
  const [title, setTitle] = useState<string>("");
  const [weeks, setWeeks] = useState<number>(8);
  const [trainingAge, setTrainingAge] = useState<
    CreatePlanRequest["training_age"] | ""
  >("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!archetype || !trainingAge) return;
    const safeArchetype = archetype as CreatePlanRequest["archetype"];
    const safeTrainingAge = trainingAge as CreatePlanRequest["training_age"];
    setLoading(true);
    setError(null);
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 1);
      const y = startDate.getFullYear();
      const m = String(startDate.getMonth() + 1).padStart(2, "0");
      const d = String(startDate.getDate()).padStart(2, "0");
      const startDateStr = `${y}-${m}-${d}`;

      const selectedArchetype = ARCHETYPES.find(
        (a) => a.value === safeArchetype,
      );
      const task = await api.plans.create(accessToken, {
        archetype: safeArchetype,
        title: title || `${selectedArchetype?.label ?? safeArchetype} plan`,
        start_date: startDateStr,
        weeks,
        training_age: safeTrainingAge,
        days_per_week: 4,
      });

      const taskId = task.task_id;
      let planId: string | null = null;

      for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 300));
        if (cancelledRef.current) return;
        const status = await api.plans.pollTask(accessToken, taskId);
        if (cancelledRef.current) return;
        if (status.status === "complete" && status.plan_id) {
          planId = status.plan_id;
          break;
        }
        if (status.status === "failed") {
          throw new Error(status.error ?? "Plan generation failed");
        }
      }

      if (!planId) throw new Error("Timed out waiting for plan");
      if (cancelledRef.current) return;
      router.push(`/plans/${planId}`);
    } catch (err) {
      if (cancelledRef.current) return;
      setError(
        err instanceof ApiError
          ? "Something went wrong. Please try again."
          : "Failed to create plan",
      );
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {step === 1 && (
        <div>
          <h2 className="mb-4 font-mono text-sm font-semibold text-[var(--text)]">
            step 1 — choose archetype
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {ARCHETYPES.map((a) => (
              <button
                key={a.value}
                data-testid={`archetype-${a.value}`}
                onClick={() => {
                  setArchetype(a.value);
                  setStep(2);
                }}
                className={`rounded-lg border p-4 text-left transition-colors ${
                  archetype === a.value
                    ? "border-[var(--accent)] bg-[rgba(88,166,255,0.12)] text-[var(--text)]"
                    : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--muted)]"
                }`}
              >
                <p className="font-mono text-sm font-semibold">{a.label}</p>
                <p className="font-mono text-xs text-[var(--muted)] mt-1">
                  {a.desc}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <h2 className="mb-4 font-mono text-sm font-semibold text-[var(--text)]">
            step 2 — duration
          </h2>
          <div className="mb-4">
            <label className="mb-2 block font-mono text-xs text-[var(--muted)]">
              title (optional)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`${
                ARCHETYPES.find((a) => a.value === archetype)?.label ??
                archetype
              } plan`}
              className="w-full rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-2 font-mono text-sm text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
          </div>
          <label className="mb-2 block font-mono text-xs text-[var(--muted)]">
            weeks: {weeks}
          </label>
          <input
            type="range"
            min={4}
            max={24}
            step={2}
            value={weeks}
            onChange={(e) => setWeeks(Number(e.target.value))}
            className="w-full accent-[var(--accent)]"
          />
          <div className="mt-1 flex justify-between font-mono text-xs text-[var(--muted)]">
            <span>4w</span>
            <span>24w</span>
          </div>
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="rounded border border-[var(--border)] px-4 py-2 font-mono text-sm text-[var(--muted)] hover:text-[var(--text)]"
            >
              back
            </button>
            <button
              onClick={() => setStep(3)}
              className="rounded bg-[var(--accent)] px-4 py-2 font-mono text-sm text-[var(--bg)] hover:brightness-110"
            >
              next
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <h2 className="mb-4 font-mono text-sm font-semibold text-[var(--text)]">
            step 3 — training age
          </h2>
          <div className="flex flex-col gap-3">
            {TRAINING_AGES.map((t) => (
              <button
                key={t.value}
                data-testid={`training-age-${t.value}`}
                onClick={() => setTrainingAge(t.value)}
                className={`rounded-lg border p-4 text-left transition-colors ${
                  trainingAge === t.value
                    ? "border-[var(--accent)] bg-[rgba(88,166,255,0.12)]"
                    : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--muted)]"
                }`}
              >
                <p className="font-mono text-sm font-semibold text-[var(--text)]">
                  {t.label}
                </p>
                <p className="font-mono text-xs text-[var(--muted)]">
                  {t.desc}
                </p>
              </button>
            ))}
          </div>

          {error && (
            <p className="mt-3 font-mono text-xs text-[var(--red)]">{error}</p>
          )}

          <div className="mt-6 flex gap-3">
            <button
              onClick={() => setStep(2)}
              className="rounded border border-[var(--border)] px-4 py-2 font-mono text-sm text-[var(--muted)] hover:text-[var(--text)]"
            >
              back
            </button>
            <button
              onClick={handleSubmit}
              disabled={!trainingAge || loading}
              className="rounded bg-[var(--accent)] px-4 py-2 font-mono text-sm text-[var(--bg)] hover:brightness-110 disabled:opacity-40"
            >
              {loading ? "generating…" : "generate plan"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
