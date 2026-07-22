"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useReducedMotion } from "motion/react";
import { api } from "@/lib/api/client";
import { createClient } from "@/lib/supabase/client";
import type { Notification } from "@/lib/api";
import { NotificationPanel } from "./NotificationPanel";

interface NotificationBellProps {
  mode: "desktop" | "mobile";
}

export function NotificationBell({ mode }: NotificationBellProps) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();

  // Fetch token from Supabase client (self-contained, no prop threading)
  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled && data.session) {
        setAccessToken(data.session.access_token);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch notifications + poll every 60 seconds once we have a token
  useEffect(() => {
    if (!accessToken) return;
    const controller = new AbortController();
    let cancelled = false;

    function fetchNotifs() {
      api.notifications
        .list(accessToken!, false, { signal: controller.signal })
        .then((notifs) => {
          if (!cancelled) setNotifications(notifs);
        })
        .catch((err) => {
          if (!cancelled && (err as Error).name !== "AbortError") {
            console.error("Notification poll failed", err);
          }
        });
    }

    fetchNotifs();
    const interval = setInterval(fetchNotifs, 60_000);
    return () => {
      cancelled = true;
      controller.abort();
      clearInterval(interval);
    };
  }, [accessToken]);

  // Close desktop dropdown on outside click
  useEffect(() => {
    if (mode !== "desktop" || !open) return;
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [mode, open]);

  const unreadCount = notifications.filter((n) => !n.read_at).length;
  const hasUnread = unreadCount > 0;

  // Don't render until we have a token
  if (!accessToken) return null;

  const bellIcon = (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  );

  if (mode === "desktop") {
    return (
      <div ref={dropdownRef} className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label={`Notifications${
            hasUnread ? ` (${unreadCount} unread)` : ""
          }`}
          className="relative flex items-center justify-center w-8 h-8 rounded-md transition-colors hover:bg-[--surface-2]"
          style={{ color: hasUnread ? "var(--text)" : "var(--muted)" }}
        >
          {bellIcon}
          {hasUnread && (
            <span
              className="absolute top-0.5 right-0.5 min-w-[14px] h-[14px] rounded-full bg-[--red] text-white font-mono text-[9px] flex items-center justify-center px-0.5"
              aria-hidden
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-2 z-50">
            <NotificationPanel
              accessToken={accessToken}
              initialNotifications={notifications}
              mode="dropdown"
              onClose={() => setOpen(false)}
            />
          </div>
        )}
      </div>
    );
  }

  // Mobile: bell opens a bottom sheet overlay
  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications${
          hasUnread ? ` (${unreadCount} unread)` : ""
        }`}
        className="relative flex items-center justify-center w-8 h-8 rounded-md transition-colors"
        style={{ color: hasUnread ? "var(--text)" : "var(--muted)" }}
      >
        {bellIcon}
        {hasUnread && (
          <span
            className="absolute top-0.5 right-0.5 min-w-[14px] h-[14px] rounded-full bg-[--red] text-white font-mono text-[9px] flex items-center justify-center px-0.5"
            aria-hidden
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open &&
        createPortal(
          <>
            {/* Scrim — a real button (not a bare div) per the accessible
                pattern already established in SheetOverlay.tsx: keyboard-
                reachable in principle, but tabIndex={-1} since Escape/the
                sheet's own controls are the intended close path. */}
            <button
              type="button"
              aria-label="Close"
              tabIndex={-1}
              className="fixed inset-0 z-40 cursor-default bg-black/50"
              onClick={() => setOpen(false)}
            />
            {/* Sheet — portaled to <body> so it escapes the header's
                backdrop-blur, which (like `filter`) establishes a new
                containing block for fixed descendants and would otherwise
                pin `bottom-0` to the 48px header instead of the viewport. */}
            <div
              className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl overflow-hidden"
              style={
                prefersReduced
                  ? undefined
                  : {
                      animation:
                        "slideUpSheet 220ms cubic-bezier(.2,.9,.3,1) forwards",
                    }
              }
            >
              {/* Grab handle */}
              <div className="bg-[--surface] pt-3 pb-1 flex justify-center border-t border-[--border]">
                <div className="w-8 h-1 rounded-full bg-[--border]" />
              </div>
              <NotificationPanel
                accessToken={accessToken}
                initialNotifications={notifications}
                mode="sheet"
                onClose={() => setOpen(false)}
              />
            </div>
          </>,
          document.body,
        )}
    </>
  );
}
