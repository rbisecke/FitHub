"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Users, Check } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api/client";
import { relativeDate, scoringTypeLabel } from "@/lib/display";
import { localDateKey } from "@/lib/units";
import { TeamSessionForm } from "./TeamSessionForm";
import type { TeamSessionSummary } from "@/lib/api";

/**
 * Derived fallback title when `name` is null (06 §1 "Unnamed session").
 *
 * The spec's ideal fallback is "{scoring_type} with {first two display
 * names} +N", but `TeamSessionSummary` (the list endpoint's row shape)
 * carries only aggregate counts — no participant identities — so the
 * per-name half of that string isn't available at this query level. This
 * degrades to a scoring-type + headcount label rather than fabricating
 * names; upgrading to real display names would need the list endpoint to
 * additionally return a small participant-name preview per row.
 */
function sessionDisplayName(ts: TeamSessionSummary): string {
  if (ts.name) return ts.name;
  const label = scoringTypeLabel(ts.scoring_type);
  const people = `${ts.participant_count} ${
    ts.participant_count === 1 ? "person" : "people"
  }`;
  return label ? `${label} — ${people}` : `Team session — ${people}`;
}

/**
 * Row-leading anchor (06 §1 "anchor every row to a circular avatar first").
 * The list endpoint (`TeamSessionSummary`) has no participant identities —
 * only aggregate counts — so this deliberately does NOT render fake
 * stacked avatar circles: a gray silhouette-per-person implies real
 * per-participant data that isn't there and reads as "unknown/broken"
 * rather than "not fetched." A plain count badge is the honest anchor
 * until the list endpoint can return a small per-row identity preview.
 */
function AvatarCluster({ count }: { count: number }) {
  return (
    <div
      className="flex size-8 shrink-0 items-center justify-center gap-1 rounded-full ring-1 ring-[var(--border)]"
      style={{ background: "var(--surface-2)" }}
      aria-hidden="true"
    >
      <Users className="size-3.5" style={{ color: "var(--muted)" }} />
      <span
        className="font-mono text-[10px] tabular-nums"
        style={{ color: "var(--muted)" }}
      >
        {count}
      </span>
    </div>
  );
}

function StatusMarker({ status }: { status: "active" | "completed" }) {
  if (status === "active") {
    return (
      <span
        className="flex items-center gap-1 font-mono text-[11px] font-semibold"
        style={{ color: "var(--amber)" }}
      >
        <span
          className="size-1.5 rounded-full"
          style={{ background: "var(--amber)" }}
          aria-hidden="true"
        />
        Live
      </span>
    );
  }
  return (
    <span
      className="flex items-center gap-1 font-mono text-[11px]"
      style={{ color: "var(--green)" }}
    >
      <Check className="size-3.5" aria-hidden="true" />
      Done
    </span>
  );
}

function Row({ ts }: { ts: TeamSessionSummary }) {
  const rowTint =
    ts.status === "active"
      ? "bg-[--amber]/6 border-l-2 border-l-[--amber]"
      : "bg-[--green]/5 border-l-2 border-l-[--green]";

  return (
    <Link
      href={`/social/team-sessions/${ts.id}`}
      className={`flex items-center gap-3 rounded-r-[8px] px-4 py-3 transition-colors hover:bg-[--surface-2] ${rowTint}`}
    >
      <AvatarCluster count={ts.participant_count} />
      <div className="min-w-0 flex-1">
        <p
          className="truncate font-sans text-[14px] font-medium"
          style={{ color: "var(--text)" }}
        >
          {sessionDisplayName(ts)}
        </p>
        <div
          className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[11px] tabular-nums"
          style={{ color: "var(--muted)" }}
        >
          <span>{relativeDate(localDateKey(ts.performed_at))}</span>
          {ts.scoring_type && (
            <span
              className="rounded px-1.5 py-0.5"
              style={{ background: "var(--surface)", color: "var(--muted)" }}
            >
              {scoringTypeLabel(ts.scoring_type)}
            </span>
          )}
          <span>
            {ts.logged_count} / {ts.participant_count} logged
          </span>
          {ts.team_size > ts.participant_count && (
            <span className="opacity-70">target {ts.team_size}</span>
          )}
        </div>
      </div>
      <StatusMarker status={ts.status} />
    </Link>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Skeleton className="size-8 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}

export function TeamSessionListScreen({
  accessToken,
  initialItems,
  initialNextCursor,
  initialLoadFailed,
}: {
  accessToken: string;
  initialItems: TeamSessionSummary[];
  initialNextCursor: string | null;
  initialLoadFailed: boolean;
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialNextCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(initialLoadFailed);
  const [createOpen, setCreateOpen] = useState(false);

  const loadMoreController = useRef<AbortController | null>(null);
  const loadMore = useCallback(() => {
    if (loadingMore || cursor == null) return;
    loadMoreController.current?.abort();
    const controller = new AbortController();
    loadMoreController.current = controller;
    setLoadingMore(true);
    api.teamSessions
      .list(
        accessToken,
        { beforeId: cursor, limit: 20 },
        { signal: controller.signal },
      )
      .then((res) => {
        if (controller.signal.aborted) return;
        setItems((prev) => [...prev, ...res.items]);
        setCursor(res.next_cursor);
        setLoadingMore(false);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        if ((err as Error).name !== "AbortError") {
          setLoadingMore(false);
          setError(true);
        }
      });
  }, [accessToken, cursor, loadingMore]);

  useEffect(() => () => loadMoreController.current?.abort(), []);

  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || cursor == null) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "400px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [cursor, loadMore]);

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-6 md:pb-10">
      {/* 06 §1 specifies a bottom-nav inset FAB on mobile, but the app shell
          already perches the global quick-log FAB in that exact slot
          (`QuickLogFab` in `mobile-bottom-nav.tsx`) — a second circular
          accent "+" FAB nearby reads as two indistinguishable primary
          actions (design-review finding). This header action stays visible
          at every width instead of introducing a second FAB convention. */}
      <div className="mb-4 flex items-center justify-between">
        <h1
          className="font-sans text-[20px] font-semibold"
          style={{ color: "var(--text)" }}
        >
          Team Sessions
        </h1>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="rounded-[8px] px-3 py-2 font-sans text-[13px] font-semibold md:px-4"
          style={{ background: "var(--accent)", color: "var(--bg)" }}
        >
          <span className="md:hidden">+ New</span>
          <span className="hidden md:inline">+ New session</span>
        </button>
      </div>

      {error && items.length === 0 && (
        <p
          className="px-4 py-6 font-sans text-[13px]"
          style={{ color: "var(--red)" }}
        >
          Couldn&apos;t load team sessions. Please try again.
        </p>
      )}

      {items.length === 0 && !error ? (
        <div className="flex flex-col items-center gap-4 px-4 py-16 text-center">
          <p
            className="font-sans text-[14px]"
            style={{ color: "var(--muted)" }}
          >
            No team sessions yet. Log a workout with a partner and record it
            here.
          </p>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="rounded-[8px] px-4 py-2 font-sans text-[13px] font-semibold"
            style={{ background: "var(--accent)", color: "var(--bg)" }}
          >
            New session
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {items.map((ts) => (
            <Row key={ts.id} ts={ts} />
          ))}
        </div>
      )}

      {cursor != null && <div ref={sentinelRef} aria-hidden="true" />}
      {loadingMore && (
        <div className="flex flex-col gap-1">
          <SkeletonRow />
        </div>
      )}
      {error && items.length > 0 && !loadingMore && (
        <div className="flex items-center justify-between px-4 py-3">
          <p className="font-sans text-[12px]" style={{ color: "var(--red)" }}>
            Couldn&apos;t load more.
          </p>
          <button
            type="button"
            onClick={() => {
              setError(false);
              loadMore();
            }}
            className="font-sans text-[12px] font-semibold"
            style={{ color: "var(--accent)" }}
          >
            Retry
          </button>
        </div>
      )}

      {createOpen && (
        <TeamSessionForm
          accessToken={accessToken}
          mode="create"
          onClose={() => setCreateOpen(false)}
          onCreated={(session) => {
            setCreateOpen(false);
            router.push(`/social/team-sessions/${session.id}`);
          }}
        />
      )}
    </div>
  );
}
