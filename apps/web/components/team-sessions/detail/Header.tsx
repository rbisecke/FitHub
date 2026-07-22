"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MoreVertical } from "lucide-react";
import { scoringTypeLabel } from "@/lib/display";
import { derivedSessionName } from "@/lib/team-sessions/leaderboard";
import type { TeamSession } from "@/lib/api";

/**
 * Session header (06 §3.1) — name/derived fallback, performed_at, scoring
 * chip, status pill ("Live · N of M logged" amber / "Final · N of M" settled),
 * and the creator-only overflow menu (edit / add participant / finalize-or-
 * reopen / delete). Hand-rolled dropdown (not shadcn `DropdownMenu`, which
 * portals to `document.body` and would escape this route's forced-dark
 * `data-theme` wrapper) — an absolutely-positioned panel inside a relatively
 * positioned trigger needs no portal since it never has to escape an ancestor
 * `overflow: hidden`.
 */
export function Header({
  session,
  loggedCount,
  totalCount,
  isCreator,
  onAddParticipant,
  onFinalizeOrReopen,
  onDeleteSession,
}: {
  session: TeamSession;
  loggedCount: number;
  totalCount: number;
  isCreator: boolean;
  onAddParticipant: () => void;
  onFinalizeOrReopen: () => void;
  onDeleteSession: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const name =
    session.name ??
    derivedSessionName(session.scoring_type, session.participants ?? []);
  const isLive = session.status === "active";
  const performedAtLabel = new Date(session.performed_at).toLocaleDateString(
    "en-US",
    { month: "short", day: "numeric", year: "numeric" },
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <h1
          className="min-w-0 truncate font-sans text-[19px] font-semibold"
          style={{ color: "var(--text)" }}
        >
          {name}
        </h1>

        {isCreator && (
          <div className="relative shrink-0" ref={menuRef}>
            <button
              type="button"
              aria-label="Session options"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
              className="flex size-9 items-center justify-center rounded-[8px]"
              style={{
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            >
              <MoreVertical size={16} aria-hidden="true" />
            </button>
            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full z-20 mt-1 w-48 overflow-hidden rounded-[8px]"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                }}
              >
                <Link
                  href={`/social/team-sessions/${session.id}/edit`}
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                  className="block px-3 py-2 font-sans text-[13px]"
                  style={{ color: "var(--text)" }}
                >
                  Edit session
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onAddParticipant();
                  }}
                  className="block w-full px-3 py-2 text-left font-sans text-[13px]"
                  style={{ color: "var(--text)" }}
                >
                  Add participant
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onFinalizeOrReopen();
                  }}
                  className="block w-full px-3 py-2 text-left font-sans text-[13px]"
                  style={{ color: "var(--text)" }}
                >
                  {isLive ? "Finalize results" : "Reopen session"}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onDeleteSession();
                  }}
                  className="block w-full px-3 py-2 text-left font-sans text-[13px]"
                  style={{ color: "var(--red)" }}
                >
                  Delete session
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span
          className="font-mono text-[12px] tabular-nums"
          style={{ color: "var(--muted)" }}
        >
          {performedAtLabel}
        </span>
        {session.scoring_type && (
          <span
            className="rounded-full px-2 py-0.5 font-mono text-[11px]"
            style={{
              background: "var(--surface)",
              color: "var(--muted)",
              border: "1px solid var(--border)",
            }}
          >
            {scoringTypeLabel(session.scoring_type)}
          </span>
        )}
        <span
          className="rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold tabular-nums"
          style={
            isLive
              ? {
                  background:
                    "color-mix(in srgb, var(--amber) 20%, transparent)",
                  color: "var(--amber)",
                }
              : {
                  background:
                    "color-mix(in srgb, var(--green) 20%, transparent)",
                  color: "var(--green)",
                }
          }
        >
          {isLive ? "Live" : "Final"} &middot; {loggedCount} of {totalCount}{" "}
          logged
        </span>
      </div>
    </div>
  );
}
