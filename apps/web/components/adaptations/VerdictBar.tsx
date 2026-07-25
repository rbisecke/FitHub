"use client";

import { useEffect, useId, useState, type CSSProperties } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";

export type Verdict = "merge" | "adjust" | "reject";

interface VerdictFieldConfig {
  required: boolean;
  minLength: number;
  maxLength: number;
  placeholder: string;
  label: string;
}

const FIELD_CONFIG: Record<Verdict, VerdictFieldConfig> = {
  merge: {
    required: false,
    minLength: 0,
    maxLength: 0,
    placeholder: "",
    label: "",
  },
  adjust: {
    required: true,
    minLength: 5,
    maxLength: 1000,
    placeholder:
      "e.g. reduce volume instead of intensity, or keep Friday's session as-is…",
    label: "What should change about this proposal? (required)",
  },
  reject: {
    required: false,
    minLength: 0,
    maxLength: 1000,
    placeholder: "Optional — why doesn't this fit right now?",
    label: "Reason (optional)",
  },
};

function VerdictForm({
  reviewedCount,
  totalCount,
  verdict,
  setVerdict,
  feedback,
  setFeedback,
  onSubmit,
  submitting,
  errorMessage,
}: {
  reviewedCount: number;
  totalCount: number;
  verdict: Verdict | null;
  setVerdict: (v: Verdict) => void;
  feedback: string;
  setFeedback: (v: string) => void;
  onSubmit: () => void;
  submitting: boolean;
  errorMessage: string | null;
}) {
  const allViewed = reviewedCount >= totalCount;
  const cfg = verdict ? FIELD_CONFIG[verdict] : null;
  const feedbackValid =
    !cfg?.required || feedback.trim().length >= cfg.minLength;
  const canSubmit =
    allViewed && verdict !== null && feedbackValid && !submitting;
  const fieldId = useId();

  return (
    <div className="flex flex-col gap-3">
      <p
        className="font-mono text-[12px] tabular-nums"
        data-testid="reviewed-counter"
        style={{ color: allViewed ? "var(--green)" : "var(--muted)" }}
      >
        {reviewedCount} / {totalCount} sessions reviewed
        {!allViewed && " — view every session to unlock a verdict"}
      </p>

      <fieldset
        disabled={!allViewed || submitting}
        className="flex flex-col gap-2"
      >
        <legend className="sr-only">Verdict</legend>
        <RadioGroup
          value={verdict ?? ""}
          onValueChange={(v) => setVerdict(v as Verdict)}
          className="grid grid-cols-3 gap-2"
        >
          {(["merge", "adjust", "reject"] as const).map((v) => {
            // Distinct semantic color per verdict (Bible 1.2): Merge=positive/
            // green, Adjust=caution/amber, Reject=danger/red — matches the
            // inline panel's filled-green Merge / outline-red Reject pair.
            // Merge and Reject carry their color permanently (not just once
            // selected), same as the inline panel's always-colored buttons —
            // otherwise all three read as identical neutral outlines until
            // one is picked. Adjust stays a neutral outline either way; it
            // only gains its amber tint once selected.
            //
            // Gated (not all sessions viewed yet, or submitting): an explicit
            // neutral style, not a blanket opacity fade on the fieldset — at
            // 50% opacity the permanently-filled green Merge button dropped
            // text-on-fill contrast well under WCAG AA and read as a dimmed
            // *active* button rather than a disabled one.
            const gated = !allViewed || submitting;
            const selected = verdict === v;
            let labelStyle: CSSProperties;
            if (gated) {
              labelStyle = {
                borderColor: "var(--border)",
                background: "var(--surface)",
                color: "var(--muted)",
                cursor: "not-allowed",
              };
            } else if (v === "merge") {
              labelStyle = selected
                ? {
                    borderColor: "var(--green)",
                    background: "var(--green)",
                    color: "var(--bg)",
                  }
                : {
                    borderColor: "var(--green)",
                    background:
                      "color-mix(in srgb, var(--green) 12%, transparent)",
                    color: "var(--green)",
                  };
            } else if (v === "reject") {
              labelStyle = selected
                ? {
                    borderColor: "var(--red)",
                    background:
                      "color-mix(in srgb, var(--red) 18%, transparent)",
                    color: "var(--red)",
                  }
                : {
                    borderColor: "var(--red)",
                    background: "transparent",
                    color: "var(--red)",
                  };
            } else {
              labelStyle = selected
                ? {
                    borderColor: "var(--amber)",
                    background:
                      "color-mix(in srgb, var(--amber) 12%, transparent)",
                    color: "var(--amber)",
                  }
                : {
                    borderColor: "var(--border)",
                    background: "transparent",
                    color: "var(--text)",
                  };
            }
            return (
              <label
                key={v}
                className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border px-2 py-2 font-mono text-[12px]"
                style={labelStyle}
              >
                <RadioGroupItem value={v} className="sr-only" />
                {v === "merge" ? "Merge" : v === "adjust" ? "Adjust" : "Reject"}
              </label>
            );
          })}
        </RadioGroup>

        {cfg && cfg.maxLength > 0 && (
          <div>
            <label
              htmlFor={fieldId}
              className="mb-1 block font-mono text-[11px]"
              style={{ color: "var(--muted)" }}
            >
              {cfg.label}
            </label>
            <Textarea
              id={fieldId}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder={cfg.placeholder}
              maxLength={cfg.maxLength}
              rows={3}
              className="font-mono text-[13px]"
            />
            <div className="mt-1 flex justify-end">
              <span
                className="font-mono text-[11px] tabular-nums"
                style={{ color: "var(--muted)" }}
              >
                {feedback.length}/{cfg.maxLength}
              </span>
            </div>
          </div>
        )}
      </fieldset>

      {errorMessage && (
        <p
          className="font-mono text-[12px]"
          style={{ color: "var(--red)" }}
          role="alert"
        >
          {errorMessage}
        </p>
      )}

      <button
        type="button"
        onClick={onSubmit}
        disabled={!canSubmit}
        data-testid="verdict-submit"
        className="min-h-11 rounded-md font-mono text-[13px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40"
        style={{
          background: canSubmit
            ? verdict === "merge"
              ? "var(--green)"
              : verdict === "adjust"
                ? "var(--amber)"
                : verdict === "reject"
                  ? "var(--red)"
                  : "var(--accent)"
            : "var(--border)",
          color: canSubmit ? "var(--bg)" : "var(--muted)",
        }}
      >
        {submitting
          ? "submitting…"
          : verdict
            ? `$ git ${
                verdict === "merge"
                  ? "merge"
                  : verdict === "adjust"
                    ? "request-changes"
                    : "close"
              }`
            : "select a verdict"}
      </button>
    </div>
  );
}

/**
 * Verdict bar (§8.3 item 3, §8.6). Desktop: pinned to the top of the review
 * list. Below 768px (§8.5A): a bottom-anchored Sheet trigger instead, so the
 * primary decision stays reachable by thumb on a long multi-session diff.
 */
export function VerdictBar(props: {
  reviewedCount: number;
  totalCount: number;
  verdict: Verdict | null;
  setVerdict: (v: Verdict) => void;
  feedback: string;
  setFeedback: (v: string) => void;
  onSubmit: () => void;
  submitting: boolean;
  errorMessage: string | null;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const allViewed = props.reviewedCount >= props.totalCount;

  // The parent nulls `verdict` after a successful Adjust (a new proposal
  // replaces the current one, but the screen stays mounted — unlike
  // Merge/Reject, which unmount this whole component when `current` becomes
  // null) and when a genuinely new adaptation appears. Both are "this
  // decision is done, close the sheet" moments; without this, the mobile
  // sheet stays open over the freshly-regenerated diff after Adjust.
  useEffect(() => {
    // Deferred to a microtask — satisfies react-hooks/set-state-in-effect
    // (a synchronous setState in an effect body triggers a same-tick
    // cascading render) while still applying before the browser paints.
    void Promise.resolve().then(() => {
      if (props.verdict === null) setSheetOpen(false);
    });
  }, [props.verdict]);

  return (
    <>
      {/* Desktop: pinned-top inline bar. */}
      <div
        className="sticky top-0 z-10 hidden rounded-lg border p-4 md:block"
        style={{ borderColor: "var(--border)", background: "var(--bg)" }}
        data-testid="verdict-bar-desktop"
      >
        <VerdictForm {...props} />
      </div>

      {/* Mobile: bottom-anchored sheet (§8.5A). */}
      <div
        className="fixed inset-x-0 bottom-0 z-20 border-t p-3 md:hidden"
        style={{ borderColor: "var(--border)", background: "var(--bg)" }}
        data-testid="verdict-bar-mobile"
      >
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger
            className="min-h-11 w-full rounded-md font-mono text-[13px] font-semibold"
            style={{
              background: allViewed ? "var(--accent)" : "var(--border)",
              color: allViewed ? "var(--bg)" : "var(--muted)",
            }}
          >
            {allViewed
              ? "Review verdict"
              : `${props.reviewedCount} / ${props.totalCount} reviewed — view all to continue`}
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Verdict</SheetTitle>
            </SheetHeader>
            <div className="px-4 pb-4">
              <VerdictForm
                {...props}
                onSubmit={() => {
                  props.onSubmit();
                }}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
