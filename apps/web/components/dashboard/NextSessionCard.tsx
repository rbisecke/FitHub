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
  metcon: "Metcon",
  skill: "Skill",
  mixed: "Mixed",
  rest: "Rest",
  active_recovery: "Active Recovery",
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

function formatExerciseLine(item: PlannedItemOut): string {
  const parts: string[] = [];
  if (item.sets != null) parts.push(`${item.sets}×`);
  if (item.reps) parts.push(item.reps);
  return parts.join("") || "";
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
  const [session, setSession] = useState<PlannedSessionOut | null | undefined>(
    undefined,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activePlanId) {
      setSession(null);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    client.plans
      .getNextSession(activePlanId, { signal: controller.signal })
      .then((data) => {
        if (cancelled) return;
        setSession(data);
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

  // Loading state — activePlanId is set but fetch hasn't resolved yet.
  if (activePlanId && session === undefined && error === null) {
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
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <div className="flex items-center gap-2">
          <span
            className="font-data text-[10px] uppercase tracking-widest"
            style={{ color: "var(--muted)" }}
          >
            $ git log --plan
          </span>
        </div>
        <p className="font-data text-[13px]" style={{ color: "var(--muted)" }}>
          No active plan — nothing to commit.
        </p>
        <Link
          href="/plans"
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
  const visibleItems = session.items
    .slice()
    .sort((a, b) => a.item_order - b.item_order)
    .slice(0, 6);

  return (
    <div
      className="rounded-lg border p-4 flex flex-col gap-3"
      style={{ borderColor: "var(--border)", background: "var(--surface)" }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <span
          className="font-data text-[10px] uppercase tracking-widest"
          style={{ color: "var(--muted)" }}
        >
          $ git checkout next-session
        </span>
        <span
          className="font-data text-[10px] rounded px-2 py-0.5"
          style={{
            background: "rgba(88,166,255,0.12)",
            color: "var(--accent)",
            border: "1px solid rgba(88,166,255,0.25)",
          }}
        >
          {sessionTypeLabel}
        </span>
      </div>

      {/* Session title / date */}
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
      </div>

      {/* Exercise list */}
      {visibleItems.length > 0 ? (
        <ul className="space-y-1.5" role="list">
          {visibleItems.map((item) => {
            const rep = formatExerciseLine(item);
            return (
              <li
                key={item.id}
                className="flex items-baseline justify-between gap-2"
              >
                <span
                  className="font-data text-[12px] truncate"
                  style={{ color: "var(--text)" }}
                >
                  {item.movement_name}
                </span>
                {rep && (
                  <span
                    className="font-mono tabular-nums text-[12px] shrink-0"
                    style={{ color: "var(--muted)" }}
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

      {/* Link to full plan */}
      <Link
        href={`/plans/${session.mesocycle_id}`}
        className="font-data text-[12px] mt-1 hover:opacity-80 transition-opacity"
        style={{ color: "var(--accent)" }}
      >
        View full plan →
      </Link>
    </div>
  );
}
