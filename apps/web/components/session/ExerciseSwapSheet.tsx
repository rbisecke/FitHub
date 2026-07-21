"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { api } from "@/lib/api/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SubstituteOption {
  movementId: string;
  movementName: string;
  movementPattern: string;
  equipmentRequired: string[];
}

export interface ExerciseSwapSheetProps {
  open: boolean;
  onClose: () => void;
  movementId: string;
  movementName: string;
  userEquipment: string[];
  accessToken: string;
  onSwap: (newMovementId: string, newMovementName: string) => void;
}

// ---------------------------------------------------------------------------
// Skeleton card
// ---------------------------------------------------------------------------

function SubstituteCardSkeleton() {
  return (
    <div
      className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 flex items-center gap-3"
      aria-hidden="true"
    >
      <div className="flex-1 flex flex-col gap-2">
        <div
          className="h-4 rounded"
          style={{ width: "60%", background: "var(--border)" }}
        />
        <div
          className="h-3 rounded"
          style={{ width: "40%", background: "var(--border)" }}
        />
        <div
          className="h-3 rounded"
          style={{ width: "30%", background: "var(--border)" }}
        />
      </div>
      <div
        className="h-10 w-[88px] rounded-lg shrink-0"
        style={{ background: "var(--border)" }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ExerciseSwapSheet({
  open,
  onClose,
  movementId,
  movementName,
  userEquipment,
  accessToken,
  onSwap,
}: ExerciseSwapSheetProps) {
  const [substitutes, setSubstitutes] = useState<SubstituteOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Confirmation state: null = no pending confirmation; set to candidate when
  // user taps "Use this instead" for the first time.
  const [pending, setPending] = useState<SubstituteOption | null>(null);

  // S4 — synchronous guard against a rapid double-tap on "Confirm";
  // confirmingRef is checked before any state update, so a second click that
  // fires before the first render commits (and before the sheet closes)
  // still can't fire onSwap twice.
  const confirmingRef = useRef(false);
  const [confirming, setConfirming] = useState(false);

  // Fetch trigger — incrementing this reruns the effect (retry).
  const [fetchKey, setFetchKey] = useState(0);

  const retry = useCallback(() => {
    setFetchKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (!open) return;

    const controller = new AbortController();
    let cancelled = false;

    // Defer resets to a microtask to satisfy react-hooks/set-state-in-effect
    void Promise.resolve().then(() => {
      if (cancelled) return;
      setSubstitutes([]);
      setLoading(true);
      setError(null);
      setPending(null);
      confirmingRef.current = false;
      setConfirming(false);
    });

    api.movements
      .getSubstitutes(accessToken, movementId, userEquipment, {
        signal: controller.signal,
      })
      .then((results) => {
        if (cancelled) return;
        setSubstitutes(
          results.map((r) => ({
            movementId: r.id,
            movementName: r.name,
            movementPattern: r.movement_pattern,
            equipmentRequired: r.equipment_required,
          })),
        );
        setLoading(false);
      })
      .catch(() => {
        if (cancelled || controller.signal.aborted) return;
        setError("Couldn't load substitutes.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
    // fetchKey intentionally included so retry re-runs the fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, movementId, accessToken, fetchKey]);

  // Abort in-flight request when sheet closes.
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        setPending(null);
        onClose();
      }
    },
    [onClose],
  );

  function handleSelectSubstitute(sub: SubstituteOption) {
    setPending(sub);
  }

  function handleConfirm() {
    if (!pending) return;
    if (confirmingRef.current) return;
    confirmingRef.current = true;
    setConfirming(true);
    onSwap(pending.movementId, pending.movementName);
    setPending(null);
    onClose();
  }

  function handleCancelConfirm() {
    setPending(null);
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      {/* data-theme="light" is required here, not just at the page level:
          shadcn's Sheet portals to document.body, which escapes the
          execute route's ForcedTheme light wrapper — without this the
          sheet renders in the app's ambient dark theme regardless of the
          light page around it (02 §7's logging-exception theme). */}
      <SheetContent
        side="bottom"
        data-theme="light"
        className="bg-[var(--surface)] border-t border-[var(--border)] rounded-t-2xl max-h-[75vh] overflow-y-auto pb-8"
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1" aria-hidden="true">
          <div
            className="rounded-full"
            style={{
              width: 44,
              height: 5,
              background: "var(--border)",
            }}
          />
        </div>

        <SheetHeader className="px-5 pt-2 pb-3">
          <p className="font-data text-[11px] text-[var(--accent)] text-left">
            $ checkout --swap
          </p>
          <SheetTitle className="font-heading text-[20px] text-[var(--text)] text-left leading-tight">
            Swap {movementName}
          </SheetTitle>
          <p className="font-sans text-[13px] text-[var(--muted)] text-left">
            Alternatives · same movement pattern
          </p>
        </SheetHeader>

        <div className="px-5 flex flex-col gap-3">
          {/* Loading skeleton */}
          {loading && (
            <>
              <SubstituteCardSkeleton />
              <SubstituteCardSkeleton />
              <SubstituteCardSkeleton />
            </>
          )}

          {/* Error state */}
          {!loading && error && (
            <div
              className="flex flex-col items-center gap-3 py-6 text-center"
              role="alert"
            >
              <p className="font-sans text-[13px] text-[var(--muted)]">
                {error}
              </p>
              <button
                onClick={retry}
                className="min-h-[44px] px-4 rounded-lg border border-[var(--border)] font-sans text-[13px] text-[var(--text)] transition-colors hover:border-[var(--accent)]"
              >
                retry
              </button>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && substitutes.length === 0 && (
            <p className="font-sans text-[13px] text-[var(--muted)] py-6 text-center">
              No substitutes available for your equipment.
            </p>
          )}

          {/* Confirmation overlay */}
          {pending && (
            <div
              className="rounded-xl border border-[var(--accent)] p-4 flex flex-col gap-3"
              style={{
                background: "color-mix(in srgb, var(--accent) 8%, transparent)",
              }}
              role="dialog"
              aria-label="Confirm exercise swap"
            >
              <p className="font-sans text-[13px] text-[var(--text)]">
                Swap <span className="font-semibold">{movementName}</span>{" "}
                <span className="text-[var(--muted)]">→</span>{" "}
                <span className="font-semibold">{pending.movementName}</span>?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleConfirm}
                  disabled={confirming}
                  aria-busy={confirming}
                  className="flex-1 min-h-[44px] rounded-lg bg-[var(--accent)] font-sans text-[12px] font-bold text-[var(--bg)] transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {confirming ? "Confirming…" : "Confirm"}
                </button>
                <button
                  onClick={handleCancelConfirm}
                  disabled={confirming}
                  className="flex-1 min-h-[44px] rounded-lg border border-[var(--border)] font-sans text-[12px] text-[var(--text)] transition-colors hover:border-[var(--accent)] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Substitute cards — ordered alphabetically by the backend, not
              by similarity (functional §9.2 note #8). No "best/closest
              match" label is shown on the first card: that would claim a
              ranking the endpoint doesn't actually compute (02 §7.3). */}
          {!loading &&
            !error &&
            substitutes.map((sub) => (
              <div
                key={sub.movementId}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 flex items-start gap-3"
              >
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-heading text-[15px] text-[var(--text)] leading-tight">
                      {sub.movementName}
                    </p>
                  </div>

                  {/* Movement pattern note */}
                  {sub.movementPattern && (
                    <p className="font-sans text-[12px] text-[var(--muted)]">
                      {sub.movementPattern}
                    </p>
                  )}

                  {/* Equipment line */}
                  {sub.equipmentRequired.length > 0 && (
                    <p className="font-sans text-[11px] text-[var(--accent)] font-semibold">
                      {sub.equipmentRequired.join(" · ")}
                    </p>
                  )}
                </div>

                {/* CTA */}
                <button
                  onClick={() => handleSelectSubstitute(sub)}
                  className="shrink-0 min-h-[44px] px-3 py-2 rounded-lg bg-[var(--accent)] font-sans text-[12px] font-bold text-[var(--bg)] transition-opacity hover:opacity-90"
                  aria-label={`Use ${sub.movementName} as substitute`}
                >
                  Use this instead
                </button>
              </div>
            ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
