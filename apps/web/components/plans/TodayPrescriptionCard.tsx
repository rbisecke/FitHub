"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createApiClient } from "@/lib/api/client";
import type { PlannedSessionOut } from "@/lib/api/plans";
import type { PersonalRecord } from "@/lib/api";
import { SessionTypeChip } from "@/components/plans/overview/chips";
import { PlateCalculatorSheet } from "@/components/logging/PlateCalculatorSheet";
import { CardioConversionChip } from "@/components/logging/CardioConversionChip";
import { WorkoutModifications } from "@/components/injuries/WorkoutModifications";
import type { ModifyWorkoutResponse } from "@/lib/api/plans";

/**
 * Today's prescription card (02 §6) — dark, glanceable check-in. Answers
 * "what am I doing today, at what actual weights, and can I start?" in one
 * glance. Resolves an active plan then that plan's `today` session; the
 * chrome-less "Rest day" treatment when `today` is null.
 *
 * Composition note (§6.1): this card is one of three regions on the Today
 * tab — the injury banner (Domain 05) ranks above it, Domain 01's quick-log
 * sits below/alongside. Neither is this component's concern; the Today
 * route places them.
 */
export function TodayPrescriptionCard({
  accessToken,
}: {
  accessToken: string;
}) {
  const client = useMemo(() => createApiClient(accessToken), [accessToken]);

  const [planId, setPlanId] = useState<string | null | undefined>(undefined);
  const [session, setSession] = useState<PlannedSessionOut | null | undefined>(
    undefined,
  );
  // Two distinct failure states, not one — "couldn't resolve which plan is
  // active" and "resolved a plan but couldn't load its today session" are
  // different failures with the same retry action but must not be
  // conflated with a genuine no-active-plan/rest-day state (a rest day is a
  // success with no data, never a failure).
  const [planError, setPlanError] = useState(false);
  const [sessionError, setSessionError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [prs, setPrs] = useState<PersonalRecord[] | null>(null);
  const [hasActiveInjuries, setHasActiveInjuries] = useState(false);
  const [calcTarget, setCalcTarget] = useState<{
    itemId: string;
    weightKg: number;
  } | null>(null);
  const [modifications, setModifications] =
    useState<ModifyWorkoutResponse | null>(null);
  const [modLoading, setModLoading] = useState(false);
  const [modError, setModError] = useState<string | null>(null);

  // Resolve the active plan, then its today session. `plans.list()` doesn't
  // accept an AbortSignal (lib/api/client.ts) — the `cancelled` flag is the
  // only guard against a stale write; cancelling the in-flight HTTP request
  // itself would need a client.ts change, out of scope here.
  useEffect(() => {
    let cancelled = false;

    void Promise.resolve().then(() => {
      if (cancelled) return;
      setPlanId(undefined);
      setPlanError(false);
    });

    client.plans
      .list()
      .then((plans) => {
        if (cancelled) return;
        const active = plans.find((p) => p.status === "active") ?? plans[0];
        setPlanId(active ? active.id : null);
      })
      .catch(() => {
        if (!cancelled) {
          setPlanError(true);
          setPlanId(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [client, retryKey]);

  useEffect(() => {
    if (planId === undefined) return;
    if (planId === null) {
      void Promise.resolve().then(() => setSession(null));
      return;
    }
    const controller = new AbortController();
    let cancelled = false;

    void Promise.resolve().then(() => {
      if (cancelled) return;
      setSession(undefined);
      setSessionError(false);
    });

    client.plans
      .today(planId, { signal: controller.signal })
      .then((data) => {
        if (!cancelled) setSession(data);
      })
      .catch(() => {
        if (!cancelled && !controller.signal.aborted) {
          setSessionError(true);
          setSession(null);
        }
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [planId, client, retryKey]);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    client.analytics
      .personalRecords({ signal: controller.signal })
      .then((data) => {
        if (!cancelled) setPrs(data);
      })
      .catch(() => {
        if (!cancelled) setPrs([]);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [client]);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    client.injuries
      .list({ signal: controller.signal })
      .then((list) => {
        if (!cancelled) {
          setHasActiveInjuries(list.some((i) => i.active));
        }
      })
      .catch(() => {
        if (!cancelled) setHasActiveInjuries(false);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [client]);

  const prsByName = useMemo(() => {
    const m = new Map<string, PersonalRecord>();
    for (const pr of prs ?? []) m.set(pr.movement_name.toLowerCase(), pr);
    return m;
  }, [prs]);

  if (session === undefined || planId === undefined) {
    return (
      <div
        data-testid="today-prescription"
        className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4"
        aria-busy="true"
      >
        <p className="font-mono text-xs text-[var(--muted)]">loading today…</p>
      </div>
    );
  }

  if (planError || sessionError) {
    return (
      <div
        data-testid="today-prescription"
        role="alert"
        className="flex items-center justify-between gap-3 rounded-lg border p-4"
        style={{
          borderColor: "color-mix(in srgb, var(--red) 35%, transparent)",
          background: "color-mix(in srgb, var(--red) 10%, transparent)",
        }}
      >
        <p className="font-mono text-xs text-[var(--red)]">
          Couldn&apos;t load today&apos;s session
        </p>
        <button
          type="button"
          onClick={() => setRetryKey((k) => k + 1)}
          className="shrink-0 rounded font-mono text-xs font-semibold"
          style={{
            border: "1px solid var(--red)",
            color: "var(--red)",
            background: "transparent",
            padding: "8px 14px",
            minHeight: "44px",
            cursor: "pointer",
          }}
        >
          retry
        </button>
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

  const isCompleted = session.status === "completed";

  return (
    <>
      <div
        data-testid="today-prescription"
        className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4"
      >
        <div className="flex items-center justify-between">
          <p className="font-mono text-xs text-[var(--accent)]">$ today</p>
          <SessionTypeChip sessionType={session.session_type} />
        </div>
        <p className="mt-1 font-sans font-semibold text-[var(--text)]">
          {session.title}
        </p>

        <ul className="mt-3 flex flex-col gap-2">
          {session.items.map((item) => {
            const pr = prsByName.get(item.movement_name.toLowerCase());
            const pct = item.load_pct_1rm;
            const resolvedKg =
              pct != null && pr
                ? Math.round(((pct / 100) * pr.best_1rm_kg) / 2.5) * 2.5
                : item.load_kg ?? null;

            return (
              <li
                key={item.id}
                className="flex flex-wrap items-baseline gap-x-2 gap-y-1"
              >
                <span className="font-sans text-sm text-[var(--text)]">
                  {item.movement_name}
                </span>
                {item.sets != null && item.reps != null && (
                  <span className="font-mono text-xs tabular-nums text-[var(--muted)]">
                    {item.sets}×{item.reps}
                  </span>
                )}
                {pct != null && (
                  <span className="font-mono text-xs tabular-nums text-[var(--amber)]">
                    {pct}%{resolvedKg != null ? ` · ${resolvedKg} kg` : ""}
                  </span>
                )}
                {pct == null && item.load_kg != null && (
                  <span className="font-mono text-xs tabular-nums text-[var(--amber)]">
                    {item.load_kg} kg
                  </span>
                )}
                {resolvedKg != null && (
                  <button
                    type="button"
                    onClick={() =>
                      setCalcTarget({ itemId: item.id, weightKg: resolvedKg })
                    }
                    aria-label={`Open load calculator for ${item.movement_name}`}
                    className="font-mono text-[11px] underline-offset-2 hover:underline"
                    style={{ color: "var(--accent)" }}
                  >
                    plates
                  </button>
                )}
                <CardioConversionChip movementName={item.movement_name} />
              </li>
            );
          })}
        </ul>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          {!isCompleted && (
            <Link
              href={`/plan/${planId}/sessions/${session.id}/execute`}
              className="rounded font-mono text-sm font-semibold"
              style={{
                background: "var(--accent)",
                color: "var(--bg)",
                padding: "10px 20px",
                minHeight: "44px",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              start session
            </Link>
          )}
          {isCompleted && (
            <span
              className="font-mono text-xs"
              style={{ color: "var(--green)" }}
            >
              ✓ completed
            </span>
          )}

          {hasActiveInjuries && session.items.length > 0 && (
            <button
              type="button"
              data-testid="modify-workout-btn"
              disabled={modLoading}
              onClick={async () => {
                setModLoading(true);
                setModError(null);
                try {
                  const result = await client.coach.modifyWorkout(session.id);
                  setModifications(result);
                } catch {
                  setModError("Could not modify workout. Please try again.");
                } finally {
                  setModLoading(false);
                }
              }}
              className="font-mono text-xs disabled:opacity-40"
              style={{ color: "var(--amber)", minHeight: "44px" }}
            >
              {modLoading ? "checking…" : "$ modify --injuries"}
            </button>
          )}

          {/* Manual-revision entry point (02 §9 — composer built by a
              sibling effort on this branch; this is the touch point only). */}
          <Link
            href={`/plan/${planId}/revise`}
            className="rounded font-mono text-xs"
            style={{
              border: "1px solid var(--border)",
              color: "var(--muted)",
              padding: "10px 16px",
              minHeight: "44px",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            $ git request-changes
          </Link>
        </div>

        {modError && (
          <p className="mt-2 font-sans text-xs text-[var(--red)]">{modError}</p>
        )}
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

      {calcTarget && (
        <PlateCalculatorSheet
          initialTarget={calcTarget.weightKg}
          weightUnit="kg"
          onClose={() => setCalcTarget(null)}
        />
      )}
    </>
  );
}
