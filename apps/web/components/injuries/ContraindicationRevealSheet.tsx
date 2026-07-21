import { Lock } from "lucide-react";
import { SheetOverlay } from "@/components/logging/SheetOverlay";
import { RegionChipStrip } from "@/components/injuries/RegionChipStrip";
import { formatLabel } from "@/lib/display";

/**
 * Contraindication reveal sheet (05 §5.1 — plan step 4.19). Opens as a
 * `Sheet` (bottom sheet / centered dialog via `SheetOverlay`, not an inline
 * expand or a blocking modal) when a flagged movement's badge is tapped.
 * Standalone + prop-driven since the real session-execution screen this
 * plugs into (Domain 02) doesn't exist yet — the eventual consumer wires
 * `onSwap` to its own substitution logic.
 */
export function ContraindicationRevealSheet({
  movementName,
  drivenBy,
  substitutions,
  onSwap,
  onClose,
  swapPending = false,
  swapError = null,
}: {
  movementName: string;
  drivenBy: string[];
  substitutions: string[];
  /** Omit (or the badge passes `undefined` under a session-wide referral
   * block) to show substitutions read-only — swapping doesn't clear a
   * referral pause, so the action shouldn't look available. */
  onSwap?: (substitution: string) => void;
  onClose: () => void;
  /** True while the caller is resolving a tapped substitution — disables
   * every "Swap in" action so a rapid double-tap can't race two lookups. */
  swapPending?: boolean;
  /** Rendered inline, near the substitution list, when the caller's swap
   * attempt failed — this sheet's own opaque backdrop would otherwise hide
   * any feedback rendered on the page behind it. */
  swapError?: string | null;
}) {
  const deduped = Array.from(new Set(substitutions));
  const swappable = Boolean(onSwap);

  return (
    <SheetOverlay title={movementName} onClose={onClose} maxHeight="70dvh">
      <div className="flex flex-col gap-4">
        <div>
          <p
            className="mb-1.5 font-sans text-[11px] font-medium uppercase tracking-wide"
            style={{ color: "var(--muted)" }}
          >
            Flagged by
          </p>
          <RegionChipStrip regions={drivenBy} />
        </div>

        {!swappable && (
          <p className="font-sans text-[12px]" style={{ color: "var(--red)" }}>
            This session is paused for professional clearance — swapping a
            movement doesn&apos;t lift the pause.
          </p>
        )}

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <p
              className="font-sans text-[11px] font-medium uppercase tracking-wide"
              style={{ color: "var(--muted)" }}
            >
              Substitutions
            </p>
            {deduped.length > 0 && (
              <span
                className="rounded-full px-1.5 py-0.5 font-sans text-[10px] font-medium"
                style={{
                  background: "var(--surface)",
                  color: "var(--muted)",
                  border: "1px solid var(--border)",
                }}
              >
                confidence: curated
              </span>
            )}
          </div>

          {deduped.length === 0 ? (
            <p
              className="font-sans text-[13px]"
              style={{ color: "var(--muted)" }}
            >
              No substitute — ask your coach.
            </p>
          ) : swappable ? (
            <ul className="flex flex-col gap-2">
              {deduped.map((sub) => (
                <li key={sub}>
                  <button
                    type="button"
                    onClick={() => onSwap?.(sub)}
                    disabled={swapPending}
                    className="flex min-h-11 w-full items-center justify-between gap-2 rounded-[8px] px-3 py-2 text-left font-sans text-[13px] disabled:cursor-not-allowed disabled:opacity-60"
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      color: "var(--text)",
                    }}
                  >
                    {formatLabel(sub)}
                    <span
                      className="shrink-0 font-sans text-[12px] font-medium"
                      style={{ color: "var(--accent)" }}
                    >
                      {swapPending ? "swapping…" : "Swap in"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="flex flex-col gap-2">
              {deduped.map((sub) => (
                <li
                  key={sub}
                  className="flex min-h-11 w-full items-center justify-between gap-2 rounded-[8px] px-3 py-2 font-sans text-[13px]"
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    color: "var(--muted)",
                  }}
                >
                  {formatLabel(sub)}
                  <Lock
                    size={12}
                    aria-hidden="true"
                    className="shrink-0"
                    style={{ color: "var(--muted)" }}
                  />
                </li>
              ))}
            </ul>
          )}

          {swapError && (
            <p
              role="alert"
              className="mt-2 font-sans text-[12px]"
              style={{ color: "var(--red)" }}
            >
              {swapError}
            </p>
          )}
        </div>
      </div>
    </SheetOverlay>
  );
}
