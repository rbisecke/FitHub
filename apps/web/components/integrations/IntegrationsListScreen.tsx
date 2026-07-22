"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Activity, CircleDot, HeartPulse, Watch } from "lucide-react";
import { api } from "@/lib/api/client";
import type { ConnectionStatus } from "@/lib/api";
import { relativeTime } from "@/lib/time";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  deriveState,
  STATE_META,
  type DerivedState,
} from "./integrationStatus";

/**
 * Connected-sources list (07 §A). Provider cards, two groups: "Connected
 * sources" (real, actionable — today only Apple Health) and "Coming soon"
 * (Oura/Strava/Garmin, visually inert). Whoop is intentionally absent
 * (research rec A.5 / functional doc §1.7) — do not add a card for it.
 *
 * Polls the list every 60s (mirrors `NotificationBell`'s pattern) so a
 * `sync_status` flip or a first-sync arriving shows up without a manual
 * reload — the design spec calls this out explicitly ("status-pill and
 * row-tint transitions cross-fade on poll refresh").
 */

function StatusPill({ state }: { state: DerivedState }) {
  const meta = STATE_META[state];
  return (
    <span
      className="shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium whitespace-nowrap transition-colors duration-200"
      style={{
        color: meta.color,
        borderColor: `color-mix(in oklab, ${meta.color} 50%, transparent)`,
        // Solid — not the same tinted mix as an errored row's background —
        // so the pill still reads as a distinct badge rather than blending
        // into a same-hue row tint (07 §A: row tint communicates state at
        // the row level, the pill communicates it as its own control).
        background: "var(--bg)",
      }}
    >
      {meta.label}
    </span>
  );
}

const COMING_SOON = [
  { name: "Oura", icon: CircleDot },
  { name: "Strava", icon: Activity },
  { name: "Garmin", icon: Watch },
] as const;

function AppleHealthRow({ conn }: { conn: ConnectionStatus }) {
  const state = deriveState(conn);
  const meta = STATE_META[state];
  // Only render a secondary line when there's an actual timestamp to show —
  // the "awaiting first sync" / never-synced-error states are already fully
  // communicated by the pill alone (07 §A: "no timestamp" for the awaiting
  // state), so a duplicate "Awaiting first sync" text line would just repeat
  // the pill's own label.
  const secondary =
    conn.last_synced_at != null
      ? `Synced ${relativeTime(conn.last_synced_at)}`
      : null;

  return (
    <Link
      href="/integrations/apple-health"
      className="flex items-center gap-3 rounded-lg border p-4 transition-colors duration-200 hover:bg-[var(--surface)]"
      style={{
        borderColor: "var(--border)",
        background: meta.rowTint
          ? "color-mix(in oklab, var(--red) 8%, var(--bg))"
          : "var(--bg)",
      }}
    >
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
        style={{ background: "var(--surface)", color: "var(--text)" }}
        aria-hidden="true"
      >
        <HeartPulse size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-sans text-[14px] font-medium text-[var(--text)]">
          Apple Health
        </span>
        <span className="line-clamp-2 font-sans text-[12px] text-[var(--muted)]">
          HRV, resting heart rate, sleep, and recovery metrics via Health Auto
          Export.
        </span>
        {secondary && (
          <span
            className="mt-1 block font-mono text-[11px] tabular-nums"
            style={{
              color: state === "error" ? "var(--red)" : "var(--muted)",
            }}
          >
            {secondary}
          </span>
        )}
      </span>
      <StatusPill state={state} />
    </Link>
  );
}

function ComingSoonRow({
  name,
  Icon,
}: {
  name: string;
  Icon: (typeof COMING_SOON)[number]["icon"];
}) {
  return (
    <div
      className="flex items-center gap-3 rounded-lg border border-dashed p-4 opacity-70"
      style={{ borderColor: "var(--border)", background: "var(--surface)" }}
    >
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
        style={{ background: "var(--bg)", color: "var(--muted-strong)" }}
        aria-hidden="true"
      >
        <Icon size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-sans text-[14px] font-medium text-[var(--text)]">
          {name}
        </span>
        <span className="block font-sans text-[12px] text-[var(--muted)]">
          We&apos;ll add this when it&apos;s ready.
        </span>
      </span>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-label="Loading integrations">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-lg border p-4"
          style={{ borderColor: "var(--border)" }}
        >
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-32 rounded-sm" />
            <Skeleton className="h-3 w-48 rounded-sm" />
          </div>
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function IntegrationsListScreen({
  token,
  initialConnections,
  initialLoadFailed,
}: {
  token: string;
  initialConnections: ConnectionStatus[];
  initialLoadFailed: boolean;
}) {
  const [connections, setConnections] =
    useState<ConnectionStatus[]>(initialConnections);
  const [loadFailed, setLoadFailed] = useState(initialLoadFailed);
  const [retrying, setRetrying] = useState(false);

  // Guards against out-of-order completion: if a slower earlier request
  // resolves after a newer one already landed, its result must not overwrite
  // the fresher state. Every `refresh` call — a poll tick or the manual
  // retry — stamps itself with the next id and checks it's still the latest
  // before committing state.
  const latestRequestId = useRef(0);

  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      const requestId = ++latestRequestId.current;
      try {
        const data = await api.integrations.list(
          token,
          signal ? { signal } : undefined,
        );
        if (signal?.aborted || requestId !== latestRequestId.current) return;
        setConnections(data);
        setLoadFailed(false);
      } catch {
        if (signal?.aborted || requestId !== latestRequestId.current) return;
        setLoadFailed(true);
      }
    },
    [token],
  );

  // Background poll (07 §A — cross-fade pill/tint on poll refresh, mirrors
  // NotificationBell's 60s interval). Each tick gets its own AbortController
  // (not one shared across the whole interval's lifetime) so a still-pending
  // earlier tick's request actually gets cancelled once a newer tick fires,
  // on top of the requestId guard in `refresh` above.
  useEffect(() => {
    let cancelled = false;
    const controllers = new Set<AbortController>();
    const interval = setInterval(() => {
      if (cancelled) return;
      const controller = new AbortController();
      controllers.add(controller);
      void refresh(controller.signal).finally(() =>
        controllers.delete(controller),
      );
    }, 60_000);
    return () => {
      cancelled = true;
      controllers.forEach((c) => c.abort());
      clearInterval(interval);
    };
  }, [refresh]);

  async function handleRetry() {
    setRetrying(true);
    const controller = new AbortController();
    try {
      await refresh(controller.signal);
    } finally {
      setRetrying(false);
    }
  }

  const appleHealth = connections.find((c) => c.provider === "apple_health");

  return (
    <div className="pb-nav-safe-fab mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="type-h2 text-foreground">Integrations</h1>
        <p className="type-small text-muted-foreground">
          Connected sources feeding your recovery score.
        </p>
      </div>

      {loadFailed && connections.length === 0 && retrying ? (
        <ListSkeleton />
      ) : loadFailed && connections.length === 0 ? (
        <div
          className="flex flex-col items-start gap-3 rounded-lg border p-4"
          style={{ borderColor: "var(--border)" }}
        >
          <p className="type-small text-destructive">
            Couldn&apos;t load your integrations. Please try again.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleRetry()}
            disabled={retrying}
          >
            {retrying ? "Retrying…" : "Retry"}
          </Button>
        </div>
      ) : (
        <>
          {appleHealth ? (
            <section className="flex flex-col gap-3">
              <h2 className="font-sans text-[12px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                Connected sources
              </h2>
              <AppleHealthRow conn={appleHealth} />
            </section>
          ) : (
            <section
              className="flex flex-col gap-3 rounded-lg border-2 p-4"
              style={{
                borderColor:
                  "color-mix(in oklab, var(--accent) 40%, transparent)",
                background: "var(--bg)",
              }}
            >
              <p className="font-sans text-[13px] text-[var(--text)]">
                Connect a source to feed your recovery score.
              </p>
              <Button
                size="sm"
                className="w-fit"
                nativeButton={false}
                render={<Link href="/integrations/apple-health" />}
              >
                Connect Apple Health
              </Button>
            </section>
          )}

          <section className="flex flex-col gap-3">
            <h2 className="font-sans text-[12px] font-semibold uppercase tracking-wide text-[var(--muted)]">
              Coming soon
            </h2>
            {COMING_SOON.map(({ name, icon }) => (
              <ComingSoonRow key={name} name={name} Icon={icon} />
            ))}
          </section>
        </>
      )}
    </div>
  );
}
