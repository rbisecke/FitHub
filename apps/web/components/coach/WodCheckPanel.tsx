"use client";

import { useState } from "react";
import { api } from "@/lib/api/client";
import type { CheckWodResponse } from "@/lib/api/plans";

interface Props {
  accessToken: string;
}

export function WodCheckPanel({ accessToken }: Props) {
  const [open, setOpen] = useState(false);
  const [wodText, setWodText] = useState("");
  const [result, setResult] = useState<CheckWodResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheck() {
    if (!wodText.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await api.coach.checkWod(accessToken, wodText);
      setResult(data);
    } catch {
      setError("Failed to check WOD. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border-b border-[var(--border)] shrink-0">
      <button
        onClick={() => {
          setOpen((v) => !v);
          if (!open) {
            setResult(null);
            setError(null);
          }
        }}
        className="w-full flex items-center justify-between px-4 py-2.5 font-mono text-xs text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--card)] transition-colors"
        aria-expanded={open}
        aria-controls="wod-check-content"
        aria-label="Toggle workout check"
      >
        <span>$ coach check-wod</span>
        <span className="text-[10px]">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div id="wod-check-content" className="px-4 pb-4 flex flex-col gap-3">
          <textarea
            value={wodText}
            onChange={(e) => setWodText(e.target.value)}
            placeholder="Paste a WOD here — e.g. '21-15-9 thrusters and pull-ups'"
            rows={3}
            className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 font-mono text-xs text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] resize-none"
          />
          <button
            data-testid="wod-check-btn"
            onClick={handleCheck}
            disabled={loading || !wodText.trim()}
            className="self-start rounded border border-[var(--accent)] px-3 py-1 font-mono text-xs text-[var(--accent)] hover:bg-[var(--accent)]/10 disabled:opacity-40 transition-colors"
          >
            {loading ? "checking…" : "$ run check"}
          </button>

          {error && (
            <p className="font-mono text-xs text-[var(--red)]">{error}</p>
          )}

          {result && (
            <div className="flex flex-col gap-2" data-testid="wod-check-result">
              {result.movements_found.length === 0 ? (
                <p className="font-mono text-xs text-[var(--muted)]">
                  # no known movements detected
                </p>
              ) : (
                <>
                  {result.any_referral_required && (
                    <p className="font-mono text-xs text-[var(--red)]">
                      ⚠ referral required for:{" "}
                      {result.referral_regions.join(", ")}
                    </p>
                  )}
                  <ul className="flex flex-col gap-1.5">
                    {result.results.map((r) => (
                      <li key={r.movement} className="flex flex-col gap-0.5">
                        <span
                          className={`font-mono text-xs font-semibold ${
                            r.safe ? "text-[var(--green)]" : "text-[var(--red)]"
                          }`}
                        >
                          {r.safe ? "✓" : "✗"} {r.movement.replace(/_/g, " ")}
                        </span>
                        {!r.safe && r.driven_by.length > 0 && (
                          <span className="font-mono text-[10px] text-[var(--muted)] ml-3">
                            blocked by: {r.driven_by.join(", ")}
                          </span>
                        )}
                        {!r.safe && r.substitutions.length > 0 && (
                          <span className="font-mono text-[10px] text-[var(--amber)] ml-3">
                            → {r.substitutions.slice(0, 3).join(", ")}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
