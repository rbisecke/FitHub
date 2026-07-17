"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createApiClient } from "@/lib/api/client";
import type { PlannedSessionOut, PlannedItemOut } from "@/lib/api/plans";

interface Props {
  accessToken: string;
  activePlanId: string | null | undefined;
}

const SESSION_TYPE_LABELS: Record<PlannedSessionOut["session_type"], string> = {
  strength: "Strength",
  metcon: "Conditioning",
  skill: "Skill",
  mixed: "Mixed",
  rest: "Rest",
  active_recovery: "Active Recovery",
};

// Map session type to design-system token for colored badges.
const SESSION_TYPE_TOKEN: Record<string, string> = {
  strength: "var(--green)",
  metcon: "var(--amber)",
  skill: "var(--accent)",
  mixed: "var(--purple)",
};

function formatScheduledDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export function formatExerciseLine(item: PlannedItemOut): string {
  const parts: string[] = [];
  if (item.sets != null) parts.push(`${item.sets}×`);
  if (item.reps) parts.push(item.reps);
  const base = parts.join("");

  const loadPart =
    item.load_kg != null
      ? `@ ${item.load_kg}kg`
      : item.load_pct_1rm != null
        ? `@ ${item.load_pct_1rm}%`
        : "";

  if (base && loadPart) return `${base} ${loadPart}`;
  return base || loadPart;
}

// hasLoad must track the actual load fields, not whether the reps string
// happens to be non-empty — a bodyweight movement has reps but no load, and
// a loaded movement can carry a null reps string (e.g. a max-effort lift).
export function itemHasLoad(
  item: Pick<PlannedItemOut, "load_kg" | "load_pct_1rm">,
): boolean {
  return item.load_kg != null || item.load_pct_1rm != null;
}

// Loading skeleton — fixed dimensions to prevent layout shift when data arrives.
function NextSessionSkeleton() {
  return (
    <div
      className="rounded-lg border p-4 space-y-3 animate-pulse"
      style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      aria-label="Loading next session"
      role="status"
    >
      <div className="flex items-center justify-between">
        <div
          className="h-3 w-24 rounded"
          style={{ background: "var(--border)" }}
        />
        <div
          className="h-3 w-16 rounded"
          style={{ background: "var(--border)" }}
        />
      </div>
      <div
        className="h-4 w-48 rounded"
        style={{ background: "var(--border)" }}
      />
      <div className="space-y-2">
        <div
          className="h-3 w-full rounded"
          style={{ background: "var(--border)" }}
        />
        <div
          className="h-3 w-5/6 rounded"
          style={{ background: "var(--border)" }}
        />
        <div
          className="h-3 w-4/6 rounded"
          style={{ background: "var(--border)" }}
        />
      </div>
    </div>
  );
}

export function NextSessionCard({ accessToken, activePlanId }: Props) {
  const client = useMemo(() => createApiClient(accessToken), [accessToken]);
  // undefined = never fetched; null = no upcoming session found (or no plan).
  const [session, setSession] = useState<PlannedSessionOut | null | undefined>(
    activePlanId ? undefined : null,
  );
  // Which planId `session` actually reflects. Loading state derives from
  // comparing this against `activePlanId`, not from overloading `session`
  // for both "never fetched" and "no plan" — that overload is what let a
  // stale `session` from a previous plan render as the wrong empty state
  // for one render after `activePlanId` changes on an already-mounted
  // instance (e.g. via router.refresh() right after plan creation).
  const [fetchedForPlanId, setFetchedForPlanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // No plan — nothing to fetch. The render below already treats
    // `!activePlanId` as the empty state regardless of any stale `session`
    // left over from a previously-mounted plan id, so no state reset is
    // needed here.
    if (!activePlanId) return;

    const controller = new AbortController();
    let cancelled = false;

    client.plans
      .getNextSession(activePlanId, { signal: controller.signal })
      .then((data) => {
        if (cancelled) return;
        setSession(data);
        setFetchedForPlanId(activePlanId);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled || controller.signal.aborted) return;
        console.error("NextSessionCard fetch failed:", err);
        setError("Could not load next session.");
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [client, activePlanId]);

  // Loading state — a plan is active but we haven't finished fetching for
  // THIS plan id yet (covers both first mount and a plan id change on an
  // already-mounted instance).
  const isLoading =
    !!activePlanId && fetchedForPlanId !== activePlanId && error === null;

  if (isLoading) {
    return <NextSessionSkeleton />;
  }

  // Error state.
  if (error) {
    return (
      <div
        className="rounded-lg border p-4"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <p className="font-data text-[12px]" style={{ color: "var(--red)" }}>
          {error}
        </p>
      </div>
    );
  }

  // Empty state — no active plan, or plan has no upcoming session.
  if (!activePlanId || session === null || session === undefined) {
    return (
      <div
        className="rounded-lg border p-4 flex flex-col gap-3"
        style={{
          borderColor: "var(--border)",
          borderStyle: "dashed",
          background: "var(--surface)",
        }}
      >
        <span
          className="font-data text-[10px] uppercase tracking-widest"
          style={{ color: "var(--muted)" }}
        >
          No active plan
        </span>
        <h3
          className="font-heading text-[16px] leading-tight"
          style={{ color: "var(--text)" }}
        >
          Nothing queued up yet
        </h3>
        <p className="font-data text-[12px]" style={{ color: "var(--muted)" }}>
          Once you generate a plan, your next session will appear here.
        </p>
        <Link
          href="/plans/new"
          className="inline-flex items-center gap-1 min-h-[44px] w-fit rounded-md px-4 py-3 font-data text-[13px] font-medium transition-opacity hover:opacity-80"
          style={{
            background: "var(--accent)",
            color: "var(--bg)",
          }}
        >
          Create plan →
        </Link>
      </div>
    );
  }

  // Data state — next session available.
  const dateLabel = formatScheduledDate(session.scheduled_date);
  const sessionTypeLabel =
    SESSION_TYPE_LABELS[session.session_type] ?? session.session_type;
  const typeToken = SESSION_TYPE_TOKEN[session.session_type] ?? "var(--muted)";
  const visibleItems = session.items
    .slice()
    .sort((a, b) => a.item_order - b.item_order)
    .slice(0, 6);

  return (
    <div
      className="rounded-lg border p-4 flex flex-col gap-3"
      style={{
        borderColor: "var(--border)",
        background: "var(--surface)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Green accent glow bar at top of card */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "3px",
          background:
            "linear-gradient(90deg, var(--green), color-mix(in srgb, var(--green) 20%, transparent))",
        }}
      />

      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <span
          className="font-data text-[10px] uppercase tracking-widest"
          style={{ color: "var(--muted)" }}
        >
          $ git checkout next-session
        </span>
      </div>

      {/* Session title / date + type badge */}
      <div>
        <p
          className="font-data text-[11px] tabular-nums"
          style={{ color: "var(--muted)" }}
        >
          Next commit: {dateLabel}
        </p>
        <h3
          className="font-heading text-[16px] mt-0.5 leading-tight"
          style={{ color: "var(--text)" }}
        >
          {session.title}
        </h3>
        {/* Session type badge */}
        <span
          className="inline-block mt-1 font-sans text-[10.5px] font-bold uppercase tracking-[0.5px] rounded px-2 py-0.5"
          style={{
            color: typeToken,
            background: `color-mix(in srgb, ${typeToken} 14%, transparent)`,
            border: `1px solid color-mix(in srgb, ${typeToken} 32%, transparent)`,
          }}
        >
          {sessionTypeLabel}
        </span>
      </div>

      {/* Exercise list */}
      {visibleItems.length > 0 ? (
        <ul className="space-y-1.5" role="list">
          {visibleItems.map((item) => {
            const rep = formatExerciseLine(item);
            const hasLoad = itemHasLoad(item);
            return (
              <li
                key={item.id}
                className="flex items-center justify-between gap-2"
              >
                <span className="flex items-center gap-1.5 min-w-0">
                  {/* Colored dot */}
                  <span
                    aria-hidden="true"
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "var(--green)",
                      flexShrink: 0,
                      display: "inline-block",
                    }}
                  />
                  <span
                    className="font-data text-[12px] truncate"
                    style={{ color: "var(--text)" }}
                  >
                    {item.movement_name}
                  </span>
                </span>
                {rep && (
                  <span
                    className="font-data tabular-nums text-[12px] font-bold shrink-0"
                    style={{ color: hasLoad ? "var(--amber)" : "var(--muted)" }}
                  >
                    {rep}
                  </span>
                )}
              </li>
            );
          })}
          {session.items.length > 6 && (
            <li
              className="font-data text-[11px]"
              style={{ color: "var(--muted)" }}
            >
              +{session.items.length - 6} more
            </li>
          )}
        </ul>
      ) : (
        <p className="font-data text-[12px]" style={{ color: "var(--muted)" }}>
          No exercises prescribed.
        </p>
      )}

      {/* Start session button */}
      <Link
        href={`/plans/${session.mesocycle_id}`}
        className="inline-flex items-center justify-center gap-1.5 min-h-[44px] w-full rounded-md px-4 py-3 font-data text-[13px] font-semibold transition-opacity hover:opacity-80"
        style={{
          background: "var(--green)",
          color: "var(--bg)",
        }}
      >
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M6 4l14 8-14 8V4z" />
        </svg>
        Start session
      </Link>

      {/* View full plan ghost link */}
      <Link
        href={`/plans/${session.mesocycle_id}`}
        className="font-data text-[12px] text-center hover:opacity-80 transition-opacity"
        style={{ color: "var(--accent)" }}
      >
        View full plan →
      </Link>
    </div>
  );
}
