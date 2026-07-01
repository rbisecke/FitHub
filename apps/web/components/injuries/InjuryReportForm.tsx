"use client";

import { useState } from "react";
import { api } from "@/lib/api/client";
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
      "other",
    ],
  },
  {
    label: "muscle",
    regions: [
      "hamstring",
      "quad",
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
    regions: ["hip_flexor", "it_band", "forearm"],
  },
] as const;

type BodyRegion = (typeof BODY_REGION_GROUPS)[number]["regions"][number];

const MECHANISMS = [
  { value: "overuse", label: "Overuse" },
  { value: "acute", label: "Acute / Sudden" },
  { value: "unknown", label: "Unknown" },
] as const;

interface Result {
  body_region: string;
  requires_referral: boolean;
  substitutions: string[];
  contraindicated: string[];
}

interface Props {
  accessToken: string;
}

export function InjuryReportForm({ accessToken }: Props) {
  const [bodyRegion, setBodyRegion] = useState<BodyRegion | "">("");
  const [painLevel, setPainLevel] = useState<number>(3);
  const [mechanism, setMechanism] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
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
      setError(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <div className="flex flex-col gap-4">
        <p className="font-mono text-sm text-zinc-400">
          # injury logged — {result.body_region}
        </p>
        {result.requires_referral && <ReferralCard />}
        <SubstitutionList
          substitutions={result.substitutions}
          bodyRegion={result.body_region}
        />
        {result.substitutions.length === 0 && !result.requires_referral && (
          <p className="font-mono text-xs text-zinc-500">
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
          className="self-start rounded border border-zinc-700 px-3 py-1.5 font-mono text-xs text-zinc-400 hover:text-zinc-200"
        >
          report another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div>
        <label className="mb-3 block font-mono text-sm text-zinc-400">
          body region
        </label>
        <div className="flex flex-col gap-3">
          {BODY_REGION_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-zinc-600">
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
                        ? "bg-indigo-700 text-white"
                        : "border border-zinc-700 text-zinc-400 hover:border-zinc-500"
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
        <label className="mb-2 block font-mono text-sm text-zinc-400">
          pain level: {painLevel}/10
        </label>
        <input
          type="range"
          min={0}
          max={10}
          value={painLevel}
          onChange={(e) => setPainLevel(Number(e.target.value))}
          data-testid="pain-slider"
          className="w-full accent-indigo-500"
        />
        <div className="mt-1 flex justify-between font-mono text-xs text-zinc-600">
          <span>0 no pain</span>
          <span>10 severe</span>
        </div>
      </div>

      <div>
        <label className="mb-2 block font-mono text-sm text-zinc-400">
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
                  ? "bg-zinc-700 text-zinc-100"
                  : "border border-zinc-700 text-zinc-500 hover:border-zinc-500"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-2 block font-mono text-sm text-zinc-400">
          notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          data-testid="injury-notes"
          placeholder="describe what happened, when it hurts, etc."
          rows={3}
          className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      {error && <p className="font-mono text-xs text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={!bodyRegion || loading}
        className="rounded bg-indigo-700 px-4 py-2 font-mono text-sm text-white hover:bg-indigo-600 disabled:opacity-40"
      >
        {loading ? "submitting…" : "submit report"}
      </button>
    </form>
  );
}
