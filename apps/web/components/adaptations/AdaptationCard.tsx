"use client";

import { useState } from "react";
import { api } from "@/lib/api/client";
import type { AdaptationOut } from "@/lib/api/plans";

const TRIGGER_LABELS: Record<string, string> = {
  high_acwr: "High ACWR",
  low_readiness: "Low Readiness",
  missed_session: "Missed Sessions",
  rpe_creep: "RPE Creep",
  active_injury: "Active Injury",
  manual: "Manual",
};

interface Props {
  adaptation: AdaptationOut;
  accessToken: string;
}

export function AdaptationCard({ adaptation, accessToken }: Props) {
  const [status, setStatus] = useState(adaptation.status);
  const [loading, setLoading] = useState<"merge" | "reject" | null>(null);

  async function handleMerge() {
    setLoading("merge");
    try {
      const updated = await api.adaptations.merge(accessToken, adaptation.id);
      setStatus(updated.status);
    } finally {
      setLoading(null);
    }
  }

  async function handleReject() {
    setLoading("reject");
    try {
      const updated = await api.adaptations.reject(accessToken, adaptation.id);
      setStatus(updated.status);
    } finally {
      setLoading(null);
    }
  }

  const isMerged = status === "merged";
  const isRejected = status === "rejected";
  const isDone = isMerged || isRejected;

  return (
    <div
      data-testid="adaptation-card"
      className={`rounded-lg border p-4 transition-colors ${
        isMerged
          ? "border-green-800 bg-green-950/30"
          : isRejected
            ? "border-zinc-800 bg-zinc-900/50 opacity-60"
            : "border-zinc-700 bg-zinc-900"
      }`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded bg-zinc-800 px-2 py-0.5 font-mono text-xs text-zinc-400">
            {TRIGGER_LABELS[adaptation.trigger_type] ?? adaptation.trigger_type}
          </span>
          {adaptation.stub && (
            <span className="rounded bg-yellow-900 px-1.5 py-0.5 font-mono text-xs text-yellow-300">
              STUB
            </span>
          )}
        </div>
        <span className="font-mono text-xs text-zinc-600">
          {adaptation.proposed_at
            ? new Date(adaptation.proposed_at).toLocaleDateString()
            : ""}
        </span>
      </div>

      {adaptation.rationale && (
        <p className="mb-3 text-sm text-zinc-300">{adaptation.rationale}</p>
      )}

      {!isDone && (
        <div className="flex gap-2">
          <button
            onClick={handleMerge}
            disabled={loading !== null}
            className="rounded bg-green-800 px-3 py-1.5 font-mono text-xs text-white hover:bg-green-700 disabled:opacity-40"
          >
            {loading === "merge" ? "merging…" : "merge"}
          </button>
          <button
            onClick={handleReject}
            disabled={loading !== null}
            className="rounded border border-zinc-600 px-3 py-1.5 font-mono text-xs text-zinc-400 hover:text-zinc-200 disabled:opacity-40"
          >
            {loading === "reject" ? "rejecting…" : "close PR"}
          </button>
        </div>
      )}

      {isMerged && <p className="font-mono text-xs text-green-400">✓ merged</p>}
      {isRejected && (
        <p className="font-mono text-xs text-zinc-500">✗ closed</p>
      )}
    </div>
  );
}
