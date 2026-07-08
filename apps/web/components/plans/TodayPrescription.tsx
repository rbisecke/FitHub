"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useReducedMotion } from "motion/react";
import { createApiClient } from "@/lib/api/client";
import { formatWeight } from "@/lib/display";
import type { PlannedSessionOut, ModifyWorkoutResponse } from "@/lib/api/plans";
import type { PersonalRecord } from "@/lib/api";
import { WorkoutModifications } from "@/components/injuries/WorkoutModifications";
import { LoadCalculator } from "@/components/shared/LoadCalculator";
import {
  CardioConversionChip,
  isCardioMovement,
  extractRunDistance,
} from "@/components/plans/CardioConversionPanel";

interface Props {
  accessToken: string;
  planId: string;
  weightUnit?: string;
  hasActiveInjuries?: boolean;
}

type SheetTarget = {
  movementName: string;
  bestKg: number;
  currentKg: number | null | undefined;
  isStale: boolean;
  pct: number;
};

function roundToNearest2p5(kg: number): number {
  return Math.round(kg / 2.5) * 2.5;
}

export function TodayPrescription({
  accessToken,
  planId,
  weightUnit = "kg",
  hasActiveInjuries = true,
}: Props) {
  const client = useMemo(() => createApiClient(accessToken), [accessToken]);
  const [session, setSession] = useState<PlannedSessionOut | null | undefined>(
    undefined,
  );
  const [prs, setPrs] = useState<PersonalRecord[] | null>(null);
  const [modifications, setModifications] =
    useState<ModifyWorkoutResponse | null>(null);
  const [modLoading, setModLoading] = useState(false);
  const [modError, setModError] = useState<string | null>(null);
  const [sheetTarget, setSheetTarget] = useState<SheetTarget | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    client.plans
      .today(planId)
      .then((data) => {
        if (data && typeof data === "object" && "id" in data) {
          setSession(data as PlannedSessionOut);
        } else {
          setSession(null);
        }
      })
      .catch(() => setSession(null));
  }, [client, planId]);

  useEffect(() => {
    let cancelled = false;
    client.analytics
      .personalRecords()
      .then((data) => {
        if (!cancelled) setPrs(data);
      })
      .catch(() => {
        if (!cancelled) setPrs([]);
      });
    return () => {
      cancelled = true;
    };
  }, [client]);

  // Name-indexed PR map (case-insensitive match)
  const prsByName = useMemo(() => {
    if (!prs) return new Map<string, PersonalRecord>();
    const m = new Map<string, PersonalRecord>();
    for (const pr of prs) {
      m.set(pr.movement_name.toLowerCase(), pr);
    }
    return m;
  }, [prs]);

  const openSheet = (target: SheetTarget) => {
    setSheetTarget(target);
    // Two rAF frames ensure the sheet renders at translateY(100%) before the
    // transition to translateY(0) begins — avoids instant-appear on slow devices
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setSheetOpen(true));
    });
  };

  const closeSheet = () => {
    setSheetOpen(false);
    // Wait for the exit transition to finish, then unmount
    setTimeout(() => setSheetTarget(null), 240);
  };

  if (session === undefined) {
    return (
      <div
        data-testid="today-prescription"
        className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4"
      >
        <p className="font-mono text-xs text-[var(--muted)]">loading today…</p>
      </div>
    );
  }

  if (session === null) {
    return (
      <div
        data-testid="today-prescription"
        className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4"
      >
        <p className="font-mono text-xs text-[var(--muted)]"># rest day</p>
      </div>
    );
  }

  return (
    <>
      <div
        data-testid="today-prescription"
        className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4"
      >
        <p className="mb-1 font-mono text-xs text-[var(--muted)]">$ today</p>
        <p className="font-semibold text-[var(--text)]">{session.title}</p>
        <p className="mt-0.5 text-xs text-[var(--muted)]">
          {session.session_type} · {session.items.length} movements
        </p>
        {session.items.length > 0 && (
          <ul className="mt-2 space-y-[6px]">
            {session.items.slice(0, 3).map((item) => {
              const pr = prsByName.get(item.movement_name.toLowerCase());
              const pct = item.load_pct_1rm;
              const hasPct = pct != null;
              const hasPR = pr != null;

              const computedKg =
                hasPct && hasPR
                  ? roundToNearest2p5((pct / 100) * pr.best_1rm_kg)
                  : null;

              const cardio = isCardioMovement(item.movement_name);
              const distKey = cardio
                ? extractRunDistance(item.movement_name)
                : null;

              return (
                <li key={item.id} className="flex flex-col gap-y-[2px]">
                  <div className="flex flex-wrap items-baseline gap-x-[6px] gap-y-[2px]">
                    {/* Movement name */}
                    <span
                      className="font-sans text-[13px]"
                      style={{ color: "var(--text)" }}
                    >
                      {item.movement_name}
                    </span>

                    {/* Sets × reps */}
                    {item.sets && item.reps && (
                      <span
                        className="font-mono text-[11px]"
                        style={{ color: "var(--muted)" }}
                      >
                        {item.sets}×{item.reps}
                      </span>
                    )}

                    {/* Percentage + computed weight */}
                    {hasPct && (
                      <>
                        <span
                          className="font-mono text-[11px]"
                          style={{ color: "var(--amber)" }}
                        >
                          @ {pct}%
                        </span>
                        <span
                          className="font-mono text-[11px]"
                          style={{ color: "var(--muted)" }}
                        >
                          →
                        </span>
                        {computedKg != null ? (
                          <button
                            onClick={() =>
                              openSheet({
                                movementName: item.movement_name,
                                bestKg: pr!.best_1rm_kg,
                                currentKg: pr!.current_e1rm_kg,
                                isStale: pr!.is_stale,
                                pct,
                              })
                            }
                            className="font-mono font-semibold text-[11px] underline-offset-2 hover:underline"
                            style={{ color: "var(--blue)" }}
                            aria-label={`Open load calculator for ${item.movement_name} at ${pct}%`}
                            data-testid={`weight-btn-${item.id}`}
                          >
                            {formatWeight(
                              computedKg,
                              weightUnit as "kg" | "lb",
                            )}
                          </button>
                        ) : (
                          <span
                            className="font-mono text-[11px]"
                            style={{ color: "var(--muted)" }}
                          >
                            ?
                          </span>
                        )}
                      </>
                    )}

                    {/* Sub cardio chip — inline next to other metadata */}
                    {distKey && <CardioConversionChip distanceKey={distKey} />}
                  </div>
                </li>
              );
            })}
            {session.items.length > 3 && (
              <li className="font-mono text-xs text-[var(--muted)]">
                +{session.items.length - 3} more
              </li>
            )}
          </ul>
        )}
        {modError && <p className="text-sm text-red-400 mt-2">{modError}</p>}
        <div className="mt-3 flex items-center gap-3">
          <Link
            href={`/plans/${planId}`}
            className="font-mono text-xs text-[var(--accent)] hover:brightness-110"
          >
            view plan →
          </Link>
          {session.items.length > 0 && hasActiveInjuries && (
            <button
              data-testid="modify-workout-btn"
              disabled={modLoading}
              onClick={async () => {
                setModLoading(true);
                setModError(null);
                try {
                  await new Promise((r) => setTimeout(r, 1500));
                  const result = await client.coach.modifyWorkout(session.id);
                  setModifications(result);
                } catch {
                  setModError("Could not modify workout. Please try again.");
                } finally {
                  setModLoading(false);
                }
              }}
              className="font-mono text-xs text-[var(--amber)] hover:brightness-110 disabled:opacity-40"
            >
              {modLoading ? "checking…" : "$ modify --injuries"}
            </button>
          )}
        </div>
        {modifications && (
          <div className="mt-4">
            <WorkoutModifications
              modifications={modifications.modifications}
              safeMovements={modifications.safe_movements}
              anyReferralRequired={modifications.any_referral_required}
              referralRegions={modifications.referral_regions}
            />
          </div>
        )}
      </div>

      {/* LoadCalculator bottom sheet */}
      {sheetTarget && (
        <div
          className="fixed inset-0 z-50"
          role="dialog"
          aria-modal="true"
          aria-label="Load calculator"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.6)" }}
            onClick={closeSheet}
          />

          {/* Sheet */}
          <div
            className="absolute bottom-0 left-0 right-0 rounded-t-[20px]"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderBottom: "none",
              maxHeight: "60dvh",
              transform: sheetOpen ? "translateY(0)" : "translateY(100%)",
              transition: prefersReducedMotion
                ? "none"
                : "transform 220ms cubic-bezier(.2,.9,.3,1)",
              paddingBottom: "env(safe-area-inset-bottom, 0px)",
            }}
            data-testid="calculator-sheet"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-[12px] pb-[8px]">
              <div
                className="w-[36px] h-[4px] rounded-full"
                style={{ background: "var(--border)" }}
              />
            </div>

            {/* Sheet header */}
            <div
              className="flex items-center justify-between px-[20px] pb-[12px]"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <div>
                <span
                  className="font-sans font-semibold text-[14px]"
                  style={{ color: "var(--text)" }}
                >
                  {sheetTarget.movementName}
                </span>
              </div>
              <button
                onClick={closeSheet}
                aria-label="Close calculator"
                className="font-data text-[18px] leading-none"
                style={{ color: "var(--muted)" }}
              >
                ×
              </button>
            </div>

            {/* Calculator body */}
            <div className="px-[20px] pt-[16px] pb-[20px] overflow-y-auto">
              <LoadCalculator
                mode="sheet"
                bestKg={sheetTarget.bestKg}
                currentKg={sheetTarget.currentKg}
                isStale={sheetTarget.isStale}
                initialPct={sheetTarget.pct}
                weightUnit={weightUnit}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
