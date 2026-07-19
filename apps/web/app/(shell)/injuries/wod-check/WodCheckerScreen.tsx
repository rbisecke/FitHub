"use client";

import { useState } from "react";
import { Check, TriangleAlert } from "lucide-react";
import { createApiClient } from "@/lib/api/client";
import type { CheckWodResponse, WodMovementResult } from "@/lib/api/plans";
import { ReferralPausePanel } from "@/components/injuries/ReferralPausePanel";
import { ContraindicationRevealSheet } from "@/components/injuries/ContraindicationRevealSheet";
import { formatLabel } from "@/lib/display";

const MAX_LEN = 2000;

function WodResultRow({ result }: { result: WodMovementResult }) {
  const [open, setOpen] = useState(false);

  if (result.safe) {
    return (
      <div
        className="flex min-h-11 w-full items-center justify-between gap-2 rounded-[8px] px-3 py-2"
        style={{
          background: "color-mix(in srgb, var(--green) 10%, var(--bg))",
          border:
            "1px solid color-mix(in srgb, var(--green) 40%, var(--border))",
        }}
      >
        <span
          className="font-sans text-[13px]"
          style={{ color: "var(--text)" }}
        >
          {formatLabel(result.movement)}
        </span>
        <span
          className="flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 font-sans text-[11px] font-semibold"
          style={{ background: "var(--green)", color: "var(--bg)" }}
        >
          <Check size={12} aria-hidden="true" />
          Safe
        </span>
      </div>
    );
  }

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen(true);
          }
        }}
        aria-label={`${formatLabel(result.movement)} — flagged, view details`}
        className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-2 rounded-[8px] px-3 py-2"
        style={{
          background: "color-mix(in srgb, var(--amber) 12%, var(--bg))",
          border:
            "1px solid color-mix(in srgb, var(--amber) 45%, var(--border))",
        }}
      >
        <span
          className="font-sans text-[13px]"
          style={{ color: "var(--text)" }}
        >
          {formatLabel(result.movement)}
        </span>
        <span
          className="flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 font-sans text-[11px] font-semibold"
          style={{ background: "var(--amber)", color: "var(--bg)" }}
        >
          <TriangleAlert size={12} aria-hidden="true" />
          Modify
        </span>
      </div>
      {open && (
        <ContraindicationRevealSheet
          movementName={formatLabel(result.movement)}
          drivenBy={result.driven_by}
          substitutions={result.substitutions}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

/**
 * Free-text WOD safety checker (05 §5.2 — plan step 4.20). Calls
 * `POST /coach/check-wod`, which only reports on movements its parser
 * recognized (`movements_found`/`results`) — there is no endpoint-provided
 * list of the leftover unrecognized tokens, so rather than guessing at a
 * client-side re-parse (which could drift from the server's parser and imply
 * false safety), this always shows an honest standing disclaimer that
 * unlisted text was not recognized and not checked.
 */
export function WodCheckerScreen({ token }: { token: string }) {
  const [text, setText] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [result, setResult] = useState<CheckWodResponse | null>(null);

  async function handleCheck() {
    const trimmed = text.trim();
    if (!trimmed) {
      setValidationError("Enter a workout description first.");
      return;
    }
    if (text.length > MAX_LEN) {
      setValidationError(`Keep it under ${MAX_LEN} characters.`);
      return;
    }
    setValidationError(null);
    setStatus("loading");
    try {
      const client = createApiClient(token);
      const res = await client.coach.checkWod(text);
      setResult(res);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-4 px-4 py-4">
      <div>
        <h1
          className="font-sans text-[20px] font-semibold"
          style={{ color: "var(--text)" }}
        >
          Check a WOD
        </h1>
        <p
          className="mt-0.5 font-sans text-[13px]"
          style={{ color: "var(--muted)" }}
        >
          Paste a workout and we&apos;ll flag movements your active injuries say
          to avoid.
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label
            htmlFor="wod-text"
            className="font-sans text-[11px] font-medium uppercase tracking-wide"
            style={{ color: "var(--muted)" }}
          >
            Workout text
          </label>
          <span
            className="font-mono tabular-nums text-[11px]"
            style={{ color: "var(--muted)" }}
          >
            {text.length}/{MAX_LEN}
          </span>
        </div>
        <textarea
          id="wod-text"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (e.target.value.trim()) setValidationError(null);
          }}
          maxLength={MAX_LEN}
          rows={6}
          placeholder={"e.g. 21-15-9\nThrusters\nPull-ups"}
          className="mt-1 w-full rounded-[8px] px-3 py-2 font-sans text-[13px]"
          style={{
            background: "var(--surface)",
            border: `1px solid ${
              validationError ? "var(--red)" : "var(--border)"
            }`,
            color: "var(--text)",
          }}
        />
        {validationError && (
          <p
            className="mt-1 font-sans text-[12px]"
            style={{ color: "var(--red)" }}
          >
            {validationError}
          </p>
        )}
      </div>

      <button
        type="button"
        disabled={status === "loading"}
        onClick={() => void handleCheck()}
        className="flex h-11 items-center justify-center rounded-[8px] px-4 font-sans text-[14px] font-semibold"
        style={{
          background: "var(--accent)",
          color: "var(--bg)",
          opacity: status === "loading" ? 0.7 : 1,
        }}
      >
        {status === "loading" ? "Checking…" : "Check this workout"}
      </button>

      {status === "error" && (
        <div className="flex flex-col items-start gap-2">
          <p className="font-sans text-[13px]" style={{ color: "var(--red)" }}>
            Couldn&apos;t check this workout. Please try again.
          </p>
          <button
            type="button"
            onClick={() => void handleCheck()}
            className="flex h-11 items-center rounded-[8px] px-3 font-sans text-[13px] font-medium"
            style={{ border: "1px solid var(--border)", color: "var(--text)" }}
          >
            Retry
          </button>
        </div>
      )}

      {result && (
        <div className="flex flex-col gap-3">
          {result.any_referral_required && (
            <ReferralPausePanel regions={result.referral_regions} />
          )}

          {result.results.length === 0 ? (
            <p
              className="font-sans text-[13px]"
              style={{ color: "var(--muted)" }}
            >
              No specific movements recognized in this text.
            </p>
          ) : (
            <div
              className="flex flex-col gap-2"
              style={
                result.any_referral_required ? { opacity: 0.7 } : undefined
              }
            >
              {result.results.map((r) => (
                <WodResultRow key={r.movement} result={r} />
              ))}
            </div>
          )}

          <p
            className="font-sans text-[11px]"
            style={{ color: "var(--muted)" }}
          >
            Anything else in your text that isn&apos;t listed above wasn&apos;t
            recognized — not recognized, not checked.
          </p>
        </div>
      )}
    </div>
  );
}
