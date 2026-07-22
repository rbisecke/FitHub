"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api/client";
import type { Notification } from "@/lib/api";
import { AvatarMonogram } from "@/components/shared/avatar-monogram";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Notification feed (06 §7). Dark by design (F1 — this panel is mounted
 * directly in the global dark shell, no ForcedTheme needed). Single column,
 * newest-first, capped at 50 server-side. Default filter is unread (F7).
 *
 * The three notification types (`workout_link_pending`, `team_session_linked`,
 * `team_session_updated`) always deep-link to the shared team-session detail
 * route `/social/team-sessions/{id}` (06 F7) — there is no notification-specific
 * view, and the target route's own 404 handling covers a deleted/inaccessible
 * session.
 */

type Filter = "unread" | "all";

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

function payloadOf(n: Notification): Record<string, unknown> {
  return (n.payload ?? {}) as Record<string, unknown>;
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffM = Math.floor(diffMs / 60_000);
  const diffH = Math.floor(diffMs / 3_600_000);
  const diffD = Math.floor(diffMs / 86_400_000);
  if (diffM < 1) return "just now";
  if (diffM < 60) return `${diffM}m ago`;
  if (diffH < 24) return `${diffH}h ago`;
  if (diffD === 1) return "Yesterday";
  return `${diffD}d ago`;
}

/**
 * Message-line copy (06 §7, the actor-name fix). The backend now always
 * populates `actor_name` + `session_name` for these three types — the
 * actor-less / session-less branches below are a defensive fallback only
 * (per spec: "designed out, not accommodated") and should not fire in
 * practice; they deliberately never render the old "Someone" placeholder.
 */
function messageFor(n: Notification): string {
  const payload = payloadOf(n);
  const actor = str(payload.actor_name);
  const session = str(payload.session_name);
  const sessionLabel = session ? `'${session}'` : "a team session";

  switch (n.type) {
    case "workout_link_pending":
      return actor
        ? `${actor} added you to ${sessionLabel} — link your result`
        : `You were added to ${sessionLabel} — link your result`;
    case "team_session_linked":
      return actor
        ? `${actor} linked a result to ${sessionLabel}`
        : `A result was linked to ${sessionLabel}`;
    case "team_session_updated":
      return actor
        ? `${actor} updated ${sessionLabel}`
        : `${sessionLabel} was updated`;
    default:
      return "New team session activity";
  }
}

function sessionHref(n: Notification): string {
  const teamSessionId = str(payloadOf(n).team_session_id);
  return teamSessionId ? `/social/team-sessions/${teamSessionId}` : "/social";
}

interface NotificationPanelProps {
  accessToken: string;
  initialNotifications?: Notification[];
  mode: "dropdown" | "sheet";
  onClose?: () => void;
}

export function NotificationPanel({
  accessToken,
  initialNotifications = [],
  mode,
  onClose,
}: NotificationPanelProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("unread");
  const [notifications, setNotifications] =
    useState<Notification[]>(initialNotifications);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [actionError, setActionError] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    async function load() {
      if (cancelled) return;
      setLoading(true);
      setFetchError(false);
      try {
        const notifs = await api.notifications.list(
          accessToken,
          filter === "all",
          { signal: controller.signal },
        );
        if (!cancelled) setNotifications(notifs);
      } catch (err) {
        if (!cancelled && (err as Error).name !== "AbortError") {
          setFetchError(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [accessToken, filter]);

  async function openNotification(n: Notification) {
    const href = sessionHref(n);
    if (!n.read_at) {
      try {
        const updated = await api.notifications.markRead(accessToken, n.id);
        setNotifications((prev) =>
          prev.map((x) => (x.id === n.id ? updated : x)),
        );
      } catch {
        // Genuine failure (e.g. network) — surface it, but the tap should
        // still navigate; there's nothing the user can retry mid-tap.
        setActionError(true);
      }
    }
    onClose?.();
    router.push(href);
  }

  async function markAllRead() {
    const unread = notifications.filter((n) => !n.read_at);
    if (unread.length === 0) return;
    setMarkingAll(true);
    setActionError(false);
    // allSettled, not all — one failed row shouldn't discard the rows that
    // did get marked read server-side (they'd otherwise stay shown as
    // unread client-side until the next full refetch).
    const results = await Promise.allSettled(
      unread.map((n) => api.notifications.markRead(accessToken, n.id)),
    );
    const updated = results
      .filter((r) => r.status === "fulfilled")
      .map((r) => r.value);
    if (updated.length > 0) {
      setNotifications((prev) =>
        prev.map((n) => updated.find((u) => u.id === n.id) ?? n),
      );
    }
    if (results.some((r) => r.status === "rejected")) {
      setActionError(true);
    }
    setMarkingAll(false);
  }

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return (
    <div
      data-testid="notification-panel"
      className={`flex flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] ${
        mode === "dropdown"
          ? "w-96 max-h-[440px] shadow-xl"
          : "w-full max-h-[80vh]"
      }`}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
        <span className="type-h3 text-[var(--text)]">Notifications</span>
        <button
          type="button"
          onClick={() => void markAllRead()}
          disabled={unreadCount === 0 || markingAll}
          className="font-sans text-xs font-medium text-[var(--accent)] disabled:cursor-default disabled:text-[var(--muted)] disabled:opacity-70"
        >
          Mark all read
        </button>
      </div>

      <div
        role="tablist"
        aria-label="Filter notifications"
        className="flex shrink-0 gap-4 border-b border-[var(--border)] px-4"
      >
        {(["unread", "all"] as const).map((f) => (
          <button
            key={f}
            type="button"
            role="tab"
            aria-selected={filter === f}
            onClick={() => setFilter(f)}
            className="border-b-2 py-2 font-sans text-xs font-medium capitalize transition-colors"
            style={{
              borderColor: filter === f ? "var(--accent)" : "transparent",
              color: filter === f ? "var(--text)" : "var(--muted)",
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {actionError && (
        <p className="shrink-0 px-4 py-1.5 font-sans text-xs text-[var(--red)]">
          Something went wrong. Please try again.
        </p>
      )}

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col gap-4 px-4 py-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="size-8 shrink-0 rounded-full" />
                <div className="flex flex-1 flex-col gap-1.5 pt-0.5">
                  <Skeleton className="h-3 w-full rounded-sm" />
                  <Skeleton className="h-3 w-1/3 rounded-sm" />
                </div>
              </div>
            ))}
          </div>
        ) : fetchError ? (
          <div className="px-4 py-6 font-sans text-xs text-[var(--muted)]">
            Could not load notifications.
          </div>
        ) : notifications.length === 0 ? (
          <div className="px-4 py-8 text-center font-sans text-xs text-[var(--muted)]">
            {filter === "unread"
              ? "You're all caught up."
              : "No notifications yet."}
          </div>
        ) : (
          notifications.map((n) => {
            const isUnread = !n.read_at;
            const payload = payloadOf(n);
            const actor = str(payload.actor_name);
            const actorSeed = str(payload.actor_user_id) ?? actor ?? "";

            return (
              <div
                key={n.id}
                className="flex gap-3 border-b border-l-2 border-[var(--border)] px-4 py-3 transition-colors duration-150 last:border-b-0"
                style={{
                  background: isUnread
                    ? "color-mix(in srgb, var(--accent) 10%, transparent)"
                    : "transparent",
                  borderLeftColor: isUnread ? "var(--accent)" : "transparent",
                }}
              >
                <button
                  type="button"
                  onClick={() => void openNotification(n)}
                  className="flex min-w-0 flex-1 gap-3 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                >
                  <AvatarMonogram
                    name={actor ?? ""}
                    seed={actorSeed}
                    size="sm"
                    className="mt-0.5"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-sans text-[13px] leading-relaxed text-[var(--text)]">
                      {messageFor(n)}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="font-mono text-[10px] text-[var(--muted)] tabular-nums">
                        {relativeTime(n.created_at)}
                      </span>
                      {n.type === "workout_link_pending" && (
                        <span className="font-sans text-[11px] font-semibold whitespace-nowrap text-[var(--accent)]">
                          Link result
                        </span>
                      )}
                    </div>
                  </div>
                </button>

                <span
                  className="mt-1 size-1.5 shrink-0 rounded-full bg-[var(--accent)]"
                  style={{ opacity: isUnread ? 1 : 0 }}
                  aria-hidden="true"
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
