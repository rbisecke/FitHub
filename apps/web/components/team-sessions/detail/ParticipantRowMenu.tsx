"use client";

import { useEffect, useRef, useState } from "react";
import { MoreVertical } from "lucide-react";
import type { TeamSessionParticipant } from "@/lib/api";

/**
 * Per-row "..." action menu shared by the ranked list and the not-yet-logged
 * group (06 §4b/§4c/§4d) — link/relink result, change role, remove/leave.
 * The router already enforces these same rules server-side (creator, or the
 * participant acting on themselves); this menu simply never renders an
 * affordance the caller isn't allowed to use, so a 403 stays an unreachable
 * defensive case rather than a normal path (§4d).
 */
export function ParticipantRowMenu({
  participant,
  isCreator,
  currentUserId,
  onLinkWorkout,
  onChangeRole,
  onRemove,
  onLeave,
}: {
  participant: TeamSessionParticipant;
  isCreator: boolean;
  currentUserId: string;
  onLinkWorkout: () => void;
  onChangeRole: () => void;
  onRemove: () => void;
  onLeave: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const isSelf = participant.user_id === currentUserId;
  const isGuest = participant.user_id == null;
  // Link/relink is scoped tighter than the backend's raw authorization check
  // (creator OR self): the creator's own workout list (`LinkWorkoutSheet`)
  // is the only source this picker has, so letting the creator "link on
  // behalf of" a REAL registered participant would attach the creator's own
  // workout to that other person's leaderboard slot — a real data-integrity
  // risk (code review 2026-07-22). A guest has no account/workout list of
  // its own, so the creator picking one of their own logged workouts as a
  // stand-in for a guest's result is the only legitimate way that ever
  // works, and stays allowed.
  const canLinkOrRelink = isSelf || (isCreator && isGuest);
  const canChangeRole = isCreator || isSelf;
  const canRemove = isCreator && !isSelf;
  const canLeave = !isCreator && isSelf;

  if (!canLinkOrRelink && !canChangeRole && !canRemove && !canLeave)
    return null;

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        aria-label={`Manage ${
          participant.display_name ?? participant.guest_name ?? "participant"
        }`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex size-7 items-center justify-center rounded-[6px]"
        style={{ color: "var(--muted)" }}
      >
        <MoreVertical size={14} aria-hidden="true" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-[8px]"
          style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
        >
          {canLinkOrRelink && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onLinkWorkout();
              }}
              className="block w-full px-3 py-2 text-left font-sans text-[13px]"
              style={{ color: "var(--text)" }}
            >
              {participant.workout_id ? "Relink result" : "Link result"}
            </button>
          )}
          {canChangeRole && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onChangeRole();
              }}
              className="block w-full px-3 py-2 text-left font-sans text-[13px]"
              style={{ color: "var(--text)" }}
            >
              Change role
            </button>
          )}
          {canRemove && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onRemove();
              }}
              className="block w-full px-3 py-2 text-left font-sans text-[13px]"
              style={{ color: "var(--red)" }}
            >
              Remove
            </button>
          )}
          {canLeave && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onLeave();
              }}
              className="block w-full px-3 py-2 text-left font-sans text-[13px]"
              style={{ color: "var(--red)" }}
            >
              Leave session
            </button>
          )}
        </div>
      )}
    </div>
  );
}
