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
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]";

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
        : "text-[var(--muted)]";

  return (
    <div
      data-testid="adaptation-card"
      className={`rounded-lg border px-4 py-4 transition-colors ${
        isMerged
          ? "border-green-800 bg-green-950/30"
          : isRejected
            ? "border-[var(--border)] bg-[var(--surface)] opacity-60"
            : "border-[var(--border)] bg-[var(--surface)]"
      }`}
    >
      {/* Header row */}
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded bg-[var(--surface)] px-2 py-0.5 font-mono text-xs text-[var(--muted)]">
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
        <span className="font-mono text-xs text-[var(--muted)]">
          {adaptation.proposed_at
            ? new Date(adaptation.proposed_at).toLocaleDateString()
            : ""}
        </span>
      </div>

      {/* Body */}
      {adaptation.rationale && (
        <p className="mb-4 text-sm text-[var(--text)]">
          {adaptation.rationale}
        </p>
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
            className={`rounded border border-[var(--border)] px-3 py-2 font-mono text-xs text-[var(--muted)] hover:border-[var(--text)] hover:text-[var(--text)] disabled:opacity-40 ${FOCUS_RING}`}
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
          className="mt-3 rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 pb-4 pt-3"
        >
          <label
            htmlFor={formId}
            className="mb-2 block font-mono text-xs text-[var(--text)]"
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
            className={`w-full resize-y rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-2 font-mono text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 focus:ring-offset-[var(--surface)]`}
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
                  ? "bg-[var(--surface)] text-[var(--muted)]"
                  : "bg-green-800 text-white hover:bg-green-700"
              }`}
            >
              {loading === "adjust" ? "revising…" : "$ commit revision"}
            </button>
            <button
              onClick={cancelRevision}
              disabled={loading !== null}
              className={`rounded border border-[var(--border)] px-3 py-2 font-mono text-xs text-[var(--muted)] hover:border-[var(--muted)] hover:text-[var(--text)] disabled:opacity-40 ${FOCUS_RING}`}
            >
              cancel
            </button>
          </div>
        </div>
      )}

      {/* Done states */}
      {isMerged && <p className="font-mono text-xs text-green-400">✓ merged</p>}
      {isRejected && (
        <p className="font-mono text-xs text-[var(--muted)]">
          {adaptation.rejection_reason ? "↺ superseded" : "✗ closed"}
        </p>
      )}
    </div>
  );
}
