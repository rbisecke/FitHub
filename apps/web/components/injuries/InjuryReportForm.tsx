"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api/client";
import type { InjuryOut } from "@/lib/api";
import { ReferralCard } from "./ReferralCard";
import { SubstitutionList } from "./SubstitutionList";

const BODY_REGION_GROUPS = [
  {
    label: "joints",
    regions: [
      "shoulder",
      "knee",
      "hip",
      "lower_back",
      "wrist",
      "elbow",
      "ankle",
      "neck",
      "si_joint",
      "other",
    ],
  },
  {
    label: "muscle",
    regions: [
      "hamstring",
      "quad",
      "groin",
      "calf",
      "glute",
      "upper_back",
      "chest",
      "bicep",
      "tricep",
      "lat",
    ],
  },
  {
    label: "soft tissue",
    regions: [
      "rotator_cuff",
      "patellar_tendon",
      "lateral_elbow",
      "medial_elbow",
      "hip_flexor",
      "it_band",
      "forearm",
    ],
  },
  {
    label: "foot / plantar",
    regions: ["arch", "achilles", "shin"],
  },
] as const;

type BodyRegion = (typeof BODY_REGION_GROUPS)[number]["regions"][number];

const MECHANISMS = [
  { value: "overuse", label: "Overuse" },
  { value: "acute", label: "Acute / Sudden" },
  { value: "unknown", label: "Unknown" },
] as const;

interface Props {
  accessToken: string;
}

export function InjuryReportForm({ accessToken }: Props) {
  const [bodyRegion, setBodyRegion] = useState<BodyRegion | "">("");
  const [painLevel, setPainLevel] = useState<number>(3);
  const [mechanism, setMechanism] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InjuryOut | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!bodyRegion) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.injuries.report(accessToken, {
        body_region: bodyRegion,
        pain_level: painLevel,
        mechanism: mechanism || null,
        notes: notes || null,
      });
      setResult(res);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? "Something went wrong. Please try again."
          : "Failed to report injury",
      );
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <div className="flex flex-col gap-4">
        <p className="font-mono text-sm text-[var(--muted)]">
          # injury logged — {result.body_region}
        </p>
        {result.requires_referral && <ReferralCard />}
        <SubstitutionList
          substitutions={result.substitutions}
          bodyRegion={result.body_region}
        />
        {result.substitutions.length === 0 && !result.requires_referral && (
          <p className="font-mono text-xs text-[var(--muted)]">
            # consult with a coach for specific movement substitutions
          </p>
        )}
        <button
          onClick={() => {
            setResult(null);
            setBodyRegion("");
            setPainLevel(3);
            setMechanism("");
            setNotes("");
          }}
          className="self-start rounded border border-[var(--border)] px-3 py-1.5 font-mono text-xs text-[var(--muted)] hover:text-[var(--text)]"
        >
          report another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div>
        <label className="mb-3 block font-mono text-sm text-[var(--muted)]">
          body region
        </label>
        <div className="flex flex-col gap-3">
          {BODY_REGION_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-[var(--muted)]">
                {group.label}
              </p>
              <div className="flex flex-wrap gap-2">
                {group.regions.map((region) => (
                  <button
                    key={region}
                    type="button"
                    data-testid={`body-region-${region}`}
                    onClick={() => setBodyRegion(region as BodyRegion)}
                    className={`rounded px-3 py-1.5 font-mono text-xs transition-colors ${
                      bodyRegion === region
                        ? "bg-[var(--accent)] text-[#0d1117]"
                        : "border border-[var(--border)] text-[var(--muted)] hover:border-[var(--muted)]"
                    }`}
                  >
                    {region.replace(/_/g, " ")}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-2 block font-mono text-sm text-[var(--muted)]">
          pain level: {painLevel}/10
        </label>
        <input
          type="range"
          min={0}
          max={10}
          value={painLevel}
          onChange={(e) => setPainLevel(Number(e.target.value))}
          data-testid="pain-slider"
          className="w-full accent-[var(--accent)]"
        />
        <div className="mt-1 flex justify-between font-mono text-xs text-[var(--muted)]">
          <span>0 no pain</span>
          <span>10 severe</span>
        </div>
      </div>

      <div>
        <label className="mb-2 block font-mono text-sm text-[var(--muted)]">
          mechanism (optional)
        </label>
        <div className="flex gap-2">
          {MECHANISMS.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setMechanism(m.value)}
              className={`rounded px-3 py-1.5 font-mono text-xs transition-colors ${
                mechanism === m.value
                  ? "bg-[var(--surface)] text-[var(--text)]"
                  : "border border-[var(--border)] text-[var(--muted)] hover:border-[var(--muted)]"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-2 block font-mono text-sm text-[var(--muted)]">
          notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          data-testid="injury-notes"
          placeholder="describe what happened, when it hurts, etc."
          rows={3}
          className="w-full rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-2 font-mono text-sm text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
        />
      </div>

      {error && <p className="font-mono text-xs text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={!bodyRegion || loading}
        className="rounded bg-[var(--accent)] px-4 py-2 font-mono text-sm text-[#0d1117] hover:brightness-110 disabled:opacity-40"
      >
        {loading ? "submitting…" : "submit report"}
      </button>
    </form>
  );
}
