"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api/client";
import type { Notification } from "@/lib/api";

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffM = Math.floor(diffMs / 60_000);
  const diffH = Math.floor(diffMs / 3_600_000);
  const diffD = Math.floor(diffMs / 86_400_000);
  if (diffM < 60) return diffM <= 1 ? "just now" : `${diffM}m ago`;
  if (diffH < 24) return `${diffH}h ago`;
  if (diffD === 1) return "Yesterday";
  return `${diffD}d ago`;
}

function notificationMessage(n: Notification): string {
  const payload = (n.payload ?? {}) as Record<string, string>;
  const sessionName = payload.session_name ?? "a team session";
  const actorName = payload.actor_name ?? "Someone";
  if (n.type === "team_session_linked")
    return `${actorName} linked their workout to your team session — ${sessionName}`;
  if (n.type === "team_session_updated")
    return `${actorName} updated the team score for ${sessionName}`;
  if (n.type === "workout_link_pending")
    return `You have a pending team session link from ${actorName}`;
  return "New team session activity";
}

function notificationLink(n: Notification): string {
  const payload = (n.payload ?? {}) as Record<string, string>;
  const tsId = payload.team_session_id;
  return tsId ? `/team-sessions/${tsId}` : "/history";
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
  const [notifications, setNotifications] =
    useState<Notification[]>(initialNotifications);
  const [loading, setLoading] = useState(initialNotifications.length === 0);

  useEffect(() => {
    api.notifications
      .list(accessToken, false)
      .then((notifs) => setNotifications(notifs))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [accessToken]);

  async function markRead(notifId: string) {
    try {
      const updated = await api.notifications.markRead(accessToken, notifId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notifId ? updated : n)),
      );
    } catch {
      // ignore
    }
  }

  async function markAllRead() {
    const unread = notifications.filter((n) => !n.read_at);
    await Promise.all(unread.map((n) => markRead(n.id)));
  }

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return (
    <div
      data-testid="notification-panel"
      className={`bg-[--surface] border border-[--border] rounded-xl overflow-hidden flex flex-col ${
        mode === "dropdown"
          ? "w-96 max-h-[400px] shadow-xl"
          : "w-full max-h-[80vh]"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[--border] shrink-0">
        <span className="font-mono text-xs text-[--text] font-semibold">
          Notifications
        </span>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="font-mono text-[10px] text-[--muted] hover:text-[--blue] transition-colors"
          >
            mark all as read
          </button>
        )}
      </div>

      {/* List */}
      <div className="overflow-y-auto flex-1">
        {loading ? (
          <div className="px-4 py-6 text-xs font-mono text-[--muted]">
            Loading…
          </div>
        ) : notifications.length === 0 ? (
          <div className="px-4 py-6 text-xs text-[--muted]">
            No activity yet. Team up on a session to see events here.
          </div>
        ) : (
          notifications.map((n) => {
            const isUnread = !n.read_at;
            return (
              <div
                key={n.id}
                className="flex gap-3 px-4 py-3 border-b border-[--border] last:border-0 transition-colors duration-150"
                style={{
                  background: isUnread ? "var(--surface-2)" : "var(--surface)",
                }}
              >
                {/* Unread dot */}
                <div className="w-4 flex-shrink-0 flex items-start pt-1">
                  <div
                    className="w-1.5 h-1.5 rounded-full bg-[--blue] transition-opacity duration-150"
                    style={{ opacity: isUnread ? 1 : 0 }}
                    aria-hidden="true"
                  />
                </div>

                {/* Message + link */}
                <div className="flex-1 min-w-0">
                  <Link
                    href={notificationLink(n)}
                    onClick={() => {
                      if (isUnread) markRead(n.id);
                      onClose?.();
                    }}
                    className="text-xs text-[--text] hover:text-[--blue] transition-colors block leading-relaxed"
                  >
                    {notificationMessage(n)}
                  </Link>
                  <span className="font-mono text-[10px] text-[--muted] mt-0.5 block">
                    {relativeTime(n.created_at)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
