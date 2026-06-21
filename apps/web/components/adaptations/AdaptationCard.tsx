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

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900";

interface Props {
  adaptation: AdaptationOut;
  accessToken: string;
  onRevised?: (newAdaptation: AdaptationOut) => void;
}

export function AdaptationCard({ adaptation, accessToken, onRevised }: Props) {
  const [status, setStatus] = useState(adaptation.status);
  const [loading, setLoading] = useState<"merge" | "reject" | "adjust" | null>(
    null,
  );
  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [feedback, setFeedback] = useState("");

  const formId = `revision-feedback-${adaptation.id}`;

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

  async function handleAdjust() {
    if (feedback.trim().length < 5) return;
    setLoading("adjust");
    try {
      const newAdaptation = await api.adaptations.adjust(
        accessToken,
        adaptation.id,
        { feedback: feedback.trim() },
      );
      setStatus("rejected");
      setShowRevisionForm(false);
      setFeedback("");
      onRevised?.(newAdaptation);
    } finally {
      setLoading(null);
    }
  }

  function cancelRevision() {
    setShowRevisionForm(false);
    setFeedback("");
  }

  const isMerged = status === "merged";
  const isRejected = status === "rejected";
  const isDone = isMerged || isRejected;

  const charCount = feedback.length;
  const counterColor =
    charCount >= 950
      ? "text-red-400"
      : charCount >= 800
        ? "text-amber-400"
        : "text-zinc-600";

  return (
    <div
      data-testid="adaptation-card"
      className={`rounded-lg border px-4 py-4 transition-colors ${
        isMerged
          ? "border-green-800 bg-green-950/30"
          : isRejected
            ? "border-zinc-800 bg-zinc-900/50 opacity-60"
            : "border-zinc-700 bg-zinc-900"
      }`}
    >
      {/* Header row */}
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded bg-zinc-800 px-2 py-0.5 font-mono text-xs text-zinc-400">
            {TRIGGER_LABELS[adaptation.trigger_type] ?? adaptation.trigger_type}
          </span>
          {adaptation.stub && (
            <span
              className="rounded bg-yellow-900 px-1.5 py-0.5 font-mono text-xs text-yellow-300"
              title="AI-generated placeholder — not yet committed to your plan"
            >
              DRAFT
            </span>
          )}
        </div>
        <span className="font-mono text-xs text-zinc-600">
          {adaptation.proposed_at
            ? new Date(adaptation.proposed_at).toLocaleDateString()
            : ""}
        </span>
      </div>

      {/* Body */}
      {adaptation.rationale && (
        <p className="mb-4 text-sm text-zinc-300">{adaptation.rationale}</p>
      )}

      {/* Primary action row */}
      {!isDone && !showRevisionForm && (
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleMerge}
            disabled={loading !== null}
            className={`rounded bg-green-800 px-5 py-2 font-mono text-xs text-white hover:bg-green-700 disabled:opacity-40 ${FOCUS_RING}`}
          >
            {loading === "merge" ? "merging…" : "merge"}
          </button>
          <button
            onClick={() => setShowRevisionForm(true)}
            disabled={loading !== null}
            className={`rounded border border-zinc-600 px-3 py-2 font-mono text-xs text-zinc-400 hover:border-zinc-400 hover:text-zinc-200 disabled:opacity-40 ${FOCUS_RING}`}
          >
            request revision
          </button>
          <button
            onClick={handleReject}
            disabled={loading !== null}
            className={`rounded px-3 py-2 font-mono text-xs text-red-500/60 hover:text-red-400 disabled:opacity-40 ${FOCUS_RING}`}
          >
            {loading === "reject" ? "closing…" : "close PR"}
          </button>
        </div>
      )}

      {/* Revision form */}
      {!isDone && showRevisionForm && (
        <div
          data-testid="revision-form"
          className="mt-3 rounded-md border border-zinc-700 bg-zinc-800/60 px-4 pb-4 pt-3"
        >
          <label
            htmlFor={formId}
            className="mb-2 block font-mono text-xs text-zinc-300"
          >
            # describe what to change
          </label>
          <textarea
            id={formId}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder={
              "e.g. reduce volume, not intensity\nor: keep the Friday session as-is"
            }
            rows={4}
            maxLength={1000}
            className={`w-full resize-y rounded border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 focus:ring-offset-zinc-900`}
          />
          <div className="mt-1 flex items-center justify-end">
            <span className={`font-mono text-xs ${counterColor}`}>
              {charCount}/1000
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              onClick={handleAdjust}
              disabled={loading !== null || feedback.trim().length < 5}
              className={`rounded px-4 py-2 font-mono text-xs transition-colors disabled:cursor-not-allowed ${FOCUS_RING} ${
                loading === "adjust" || feedback.trim().length < 5
                  ? "bg-zinc-800 text-zinc-600"
                  : "bg-green-800 text-white hover:bg-green-700"
              }`}
            >
              {loading === "adjust" ? "revising…" : "$ commit revision"}
            </button>
            <button
              onClick={cancelRevision}
              disabled={loading !== null}
              className={`rounded border border-zinc-700 px-3 py-2 font-mono text-xs text-zinc-500 hover:border-zinc-500 hover:text-zinc-300 disabled:opacity-40 ${FOCUS_RING}`}
            >
              cancel
            </button>
          </div>
        </div>
      )}

      {/* Done states */}
      {isMerged && <p className="font-mono text-xs text-green-400">✓ merged</p>}
      {isRejected && (
        <p className="font-mono text-xs text-zinc-500">
          {adaptation.rejection_reason ? "↺ superseded" : "✗ closed"}
        </p>
      )}
    </div>
  );
}
