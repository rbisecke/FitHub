"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api/client";
import type { CreatePlanRequest } from "@/lib/api/plans";

const GOALS = [
  { value: "general_fitness", label: "General Fitness" },
  { value: "strength", label: "Strength" },
  { value: "endurance", label: "Endurance" },
  { value: "competition_prep", label: "Competition Prep" },
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
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [goal, setGoal] = useState<CreatePlanRequest["goal"] | "">("");
  const [title, setTitle] = useState<string>("");
  const [weeks, setWeeks] = useState<number>(8);
  const [trainingAge, setTrainingAge] = useState<
    CreatePlanRequest["training_age"] | ""
  >("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!goal || !trainingAge) return;
    // Narrowed: goal and trainingAge are non-empty after the guard above
    const safeGoal = goal as CreatePlanRequest["goal"];
    const safeTrainingAge = trainingAge as CreatePlanRequest["training_age"];
    setLoading(true);
    setError(null);
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 1);
      const startDateStr = startDate.toISOString().split("T")[0] ?? "";

      const task = await api.plans.create(accessToken, {
        goal: safeGoal,
        title: title || `${safeGoal.replace("_", " ")} plan`,
        start_date: startDateStr,
        weeks,
        training_age: safeTrainingAge,
      });

      const taskId = task.task_id;
      let planId: string | null = null;

      for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 300));
        const status = await api.plans.pollTask(accessToken, taskId);
        if (status.status === "complete" && status.plan_id) {
          planId = status.plan_id;
          break;
        }
        if (status.status === "failed") {
          throw new Error(status.error ?? "Plan generation failed");
        }
      }

      if (!planId) throw new Error("Timed out waiting for plan");
      router.push(`/plans/${planId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create plan");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {step === 1 && (
        <div>
          <h2 className="mb-4 font-mono text-sm font-semibold text-zinc-300">
            step 1 — choose goal
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {GOALS.map((g) => (
              <button
                key={g.value}
                data-testid={`goal-${g.value}`}
                onClick={() => {
                  setGoal(g.value);
                  setStep(2);
                }}
                className={`rounded-lg border p-4 text-left transition-colors ${
                  goal === g.value
                    ? "border-indigo-500 bg-indigo-900/30 text-zinc-100"
                    : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-600"
                }`}
              >
                <p className="font-mono text-sm font-semibold">{g.label}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <h2 className="mb-4 font-mono text-sm font-semibold text-zinc-300">
            step 2 — duration
          </h2>
          <div className="mb-4">
            <label className="mb-2 block font-mono text-xs text-zinc-400">
              title (optional)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`${goal.replace("_", " ")} plan`}
              className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <label className="mb-2 block font-mono text-xs text-zinc-400">
            weeks: {weeks}
          </label>
          <input
            type="range"
            min={4}
            max={24}
            step={2}
            value={weeks}
            onChange={(e) => setWeeks(Number(e.target.value))}
            className="w-full accent-indigo-500"
          />
          <div className="mt-1 flex justify-between font-mono text-xs text-zinc-600">
            <span>4w</span>
            <span>24w</span>
          </div>
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="rounded border border-zinc-700 px-4 py-2 font-mono text-sm text-zinc-400 hover:text-zinc-200"
            >
              back
            </button>
            <button
              onClick={() => setStep(3)}
              className="rounded bg-indigo-700 px-4 py-2 font-mono text-sm text-white hover:bg-indigo-600"
            >
              next
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <h2 className="mb-4 font-mono text-sm font-semibold text-zinc-300">
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
                    ? "border-indigo-500 bg-indigo-900/30"
                    : "border-zinc-700 bg-zinc-900 hover:border-zinc-600"
                }`}
              >
                <p className="font-mono text-sm font-semibold text-zinc-100">
                  {t.label}
                </p>
                <p className="font-mono text-xs text-zinc-500">{t.desc}</p>
              </button>
            ))}
          </div>

          {error && (
            <p className="mt-3 font-mono text-xs text-red-400">{error}</p>
          )}

          <div className="mt-6 flex gap-3">
            <button
              onClick={() => setStep(2)}
              className="rounded border border-zinc-700 px-4 py-2 font-mono text-sm text-zinc-400 hover:text-zinc-200"
            >
              back
            </button>
            <button
              onClick={handleSubmit}
              disabled={!trainingAge || loading}
              className="rounded bg-indigo-700 px-4 py-2 font-mono text-sm text-white hover:bg-indigo-600 disabled:opacity-40"
            >
              {loading ? "generating…" : "generate plan"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
