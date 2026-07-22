"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, PenLine } from "lucide-react";
import { createApiClient } from "@/lib/api/client";
import type { CheckWodResponse } from "@/lib/api/plans";
import {
  ReferralBanner,
  ResultGroupHeading,
  SafeRow,
  SubstituteRow,
} from "@/components/coach/InjuryReviewRows";

const MAX_LEN = 2000;

/**
 * Standalone WOD safety checker (03 §12) plus the log-parse launcher (03
 * §10) — the coach domain's "utility area." Fully deterministic text
 * matching, no LLM, never gated by the kill-switch (FR §3/§7). Light review
 * surface (§0.1); shares the amber/green/red row scheme with the
 * modify-workout results screen (§11) so the two injury-engine utilities
 * read as one family.
 */
export function WodCheckerScreen({ token }: { token: string }) {
  const [text, setText] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CheckWodResponse | null>(null);

  async function handleCheck() {
    const trimmed = text.trim();
    if (trimmed === "" || checking) return;
    setChecking(true);
    setError(null);
    try {
      const client = createApiClient(token);
      const res = await client.coach.checkWod(trimmed);
      setResult(res);
    } catch {
      // Clear any previous (now stale) result — leaving it on screen would
      // show a result for a WOD the user has since edited or moved past.
      setResult(null);
      setError(
        "Couldn't check that WOD — check your connection and try again.",
      );
    } finally {
      setChecking(false);
    }
  }

  return (
    // Extra mobile-only bottom padding beyond the shell's own `pb-nav-safe`:
    // the quick-log FAB perches above the tab bar's top edge and can still
    // clip the last result row at the very bottom of a scroll.
    <div className="mx-auto flex w-full max-w-[640px] flex-col gap-6 px-4 pb-24 pt-8 md:pb-8">
      <div>
        <h1
          className="mb-1 font-sans text-[18px] font-semibold"
          style={{ color: "var(--text)" }}
        >
          Coach utilities
        </h1>
        <p className="font-sans text-[13px]" style={{ color: "var(--muted)" }}>
          Deterministic tools — no chat, no LLM. Results are curated, not
          AI-generated.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <p
          className="font-sans text-[11px] font-medium uppercase tracking-wide"
          style={{ color: "var(--muted)" }}
        >
          AI-assisted
        </p>
        <Link
          href="/log/describe"
          className="flex items-center justify-between gap-3 rounded-[10px] px-4 py-3"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
          }}
        >
          <span className="flex items-center gap-2">
            <PenLine
              size={16}
              aria-hidden="true"
              style={{ color: "var(--accent)" }}
            />
            <span
              className="font-sans text-[14px] font-medium"
              style={{ color: "var(--text)" }}
            >
              Describe a workout
            </span>
          </span>
          <ArrowRight
            size={14}
            aria-hidden="true"
            style={{ color: "var(--accent)" }}
          />
        </Link>
      </div>

      <div className="flex flex-col gap-2">
        <p
          className="font-sans text-[11px] font-medium uppercase tracking-wide"
          style={{ color: "var(--muted)" }}
        >
          Deterministic
        </p>
        <h2
          className="font-sans text-[15px] font-semibold"
          style={{ color: "var(--text)" }}
        >
          Check a WOD
        </h2>
        <p className="font-sans text-[13px]" style={{ color: "var(--muted)" }}>
          Paste a workout and see which movements are safe, which need a
          substitution, and whether any require a professional referral — before
          you touch the chat.
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={checking}
          maxLength={MAX_LEN}
          rows={5}
          placeholder={"e.g. 21-15-9\nThrusters\nPull-ups"}
          aria-label="WOD text"
          className="w-full rounded-[8px] px-3 py-2 font-sans text-[14px] disabled:opacity-60"
          style={{
            background: "var(--surface)",
            color: "var(--text)",
            border: "1px solid var(--border)",
          }}
        />
        <div className="flex items-center justify-between">
          <span
            className="font-mono text-[11px] tabular-nums"
            style={{ color: "var(--muted)" }}
          >
            {text.length}/{MAX_LEN}
          </span>
          <button
            type="button"
            onClick={() => void handleCheck()}
            disabled={checking || text.trim() === ""}
            className="rounded-[8px] px-4 py-2 font-sans text-[13px] font-semibold"
            style={{
              background: "var(--accent)",
              color: "var(--bg)",
              opacity: checking || text.trim() === "" ? 0.6 : 1,
            }}
          >
            {checking ? "Checking…" : "Check"}
          </button>
        </div>
      </div>

      {error && (
        <p className="font-sans text-[13px]" style={{ color: "var(--red)" }}>
          {error}
        </p>
      )}

      {result && (
        <div className="flex flex-col gap-6">
          {result.any_referral_required && (
            <ReferralBanner regions={result.referral_regions} />
          )}

          {result.movements_found.length === 0 ? (
            <p
              className="font-sans text-[13px]"
              style={{ color: "var(--muted)" }}
            >
              No known movements detected in that text.
            </p>
          ) : (
            <>
              {result.results.some((r) => !r.safe) && (
                <section className="flex flex-col gap-2">
                  <ResultGroupHeading
                    label="Must substitute"
                    count={result.results.filter((r) => !r.safe).length}
                    level={3}
                  />
                  <div className="flex flex-col gap-2">
                    {result.results
                      .filter((r) => !r.safe)
                      .map((r, i) => (
                        <SubstituteRow
                          key={`${r.movement}-${i}`}
                          movementName={r.movement}
                          drivenBy={r.driven_by}
                          substitutions={r.substitutions}
                        />
                      ))}
                  </div>
                </section>
              )}

              {result.results.some((r) => r.safe) && (
                <section className="flex flex-col gap-2">
                  <ResultGroupHeading
                    label="Safe as-is"
                    count={result.results.filter((r) => r.safe).length}
                    level={3}
                  />
                  <div className="flex flex-col gap-2">
                    {result.results
                      .filter((r) => r.safe)
                      .map((r, i) => (
                        <SafeRow
                          key={`${r.movement}-${i}`}
                          movementName={r.movement}
                        />
                      ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
