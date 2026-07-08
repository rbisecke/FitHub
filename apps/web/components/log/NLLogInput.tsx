"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api/client";
import type { ParseLogResponse } from "@/lib/api";

interface NLLogInputProps {
  accessToken: string;
}

export function NLLogInput({ accessToken }: NLLogInputProps) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [result, setResult] = useState<ParseLogResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const showStubBadge = process.env.NEXT_PUBLIC_SHOW_STUB_BADGE !== "false";

  async function handleParsing() {
    const trimmed = text.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.coach.parseLog(accessToken, trimmed);
      setResult(res);
    } catch {
      setError("Could not parse workout. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function handlePrefill() {
    if (!result) return;
    const encoded = encodeURIComponent(JSON.stringify(result.parsed));
    router.push(`/log/new?prefill=${encoded}`);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label
          className="font-mono text-xs text-[var(--muted)]"
          htmlFor="nl-log-input"
        >
          Describe your workout in plain text
        </label>
        <textarea
          id="nl-log-input"
          data-testid="nl-log-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder='e.g. "Fran 4:32, banded pull-ups" or "back squat 5x5 @ 100kg, felt strong"'
          rows={4}
          className="rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-2 font-mono text-sm text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
        />
      </div>

      <button
        onClick={handleParsing}
        disabled={loading || !text.trim()}
        className="self-start rounded bg-[var(--accent)] px-4 py-2 font-mono text-sm text-[#0d1117] hover:brightness-110 disabled:opacity-40"
      >
        {loading ? "parsing..." : "pre-fill from text"}
      </button>

      {error && <p className="font-mono text-xs text-red-400">{error}</p>}

      {result && (
        <div className="rounded border border-[var(--border)] bg-[var(--surface)] p-4 text-sm">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[var(--text)]">
              <span className="text-[var(--muted)]">title:</span>{" "}
              {result.parsed.title ?? "(untitled)"}
            </p>
            <div className="flex items-center gap-2">
              {result.stub && showStubBadge && (
                <span
                  className="rounded bg-yellow-600 px-1.5 py-0.5 font-mono text-xs text-yellow-50"
                  data-testid="stub-mode-badge"
                >
                  STUB
                </span>
              )}
              <span className="font-mono text-xs text-[var(--muted)]">
                {Math.round(result.confidence * 100)}% confidence
              </span>
            </div>
          </div>

          <p className="mt-1 font-mono text-xs text-[var(--muted)]">
            {result.parsed.session_type}
            {result.parsed.workout_format
              ? ` · ${result.parsed.workout_format}`
              : ""}
            {result.parsed.duration_s
              ? ` · ${Math.floor(result.parsed.duration_s / 60)}:${String(
                  result.parsed.duration_s % 60,
                ).padStart(2, "0")}`
              : ""}
          </p>

          {result.parsed.results.length > 0 && (
            <ul className="mt-3 space-y-1">
              {result.parsed.results.map((r, i) => (
                <li
                  key={r.movement_name ?? i}
                  className="font-mono text-xs text-[var(--text)]"
                >
                  {r.movement_name}
                  {r.reps != null ? ` · ${r.reps} reps` : ""}
                  {r.load_kg != null ? ` @ ${r.load_kg}kg` : ""}
                  {r.scaled ? " (scaled)" : ""}
                  {r.notes ? ` — ${r.notes}` : ""}
                </li>
              ))}
            </ul>
          )}

          <button
            onClick={handlePrefill}
            className="mt-3 rounded bg-[var(--surface)] px-3 py-1.5 font-mono text-xs text-[var(--text)] hover:opacity-80"
          >
            use this pre-fill →
          </button>
        </div>
      )}
    </div>
  );
}
