import { AvatarMonogram } from "@/components/shared/avatar-monogram";
import { ParticipantRowMenu } from "@/components/team-sessions/detail/ParticipantRowMenu";
import type { TeamSessionParticipant } from "@/lib/api";

/**
 * Not-yet-logged group (06 §3.5) — participants/guests with no linked
 * result, un-ranked. On Final this becomes "Did not log" (a DNF-style state:
 * present, visible, explicitly un-ranked, never erased — §6). A persistent
 * banner sits above the group when the viewer themselves hasn't logged.
 */
export function NotYetLoggedGroup({
  rows,
  isFinal,
  isCreator,
  currentUserId,
  viewerHasLogged,
  onLinkOwnWorkout,
  onLinkWorkout,
  onChangeRole,
  onRemove,
  onLeave,
}: {
  rows: TeamSessionParticipant[];
  isFinal: boolean;
  isCreator: boolean;
  currentUserId: string;
  viewerHasLogged: boolean;
  onLinkOwnWorkout: () => void;
  onLinkWorkout: (p: TeamSessionParticipant) => void;
  onChangeRole: (p: TeamSessionParticipant) => void;
  onRemove: (p: TeamSessionParticipant) => void;
  onLeave: (p: TeamSessionParticipant) => void;
}) {
  if (rows.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <h2
        className="font-sans text-[11px] font-medium uppercase tracking-wide"
        style={{ color: "var(--muted)" }}
      >
        {isFinal ? "Did not log" : "Not yet logged"}
      </h2>

      {!isFinal && !viewerHasLogged && (
        <div
          className="flex items-center justify-between gap-3 rounded-[8px] px-3 py-2.5"
          style={{
            background: "color-mix(in srgb, var(--accent) 12%, transparent)",
            border:
              "1px solid color-mix(in srgb, var(--accent) 40%, transparent)",
          }}
        >
          <p className="font-sans text-[13px]" style={{ color: "var(--text)" }}>
            You haven&apos;t logged your result
          </p>
          <button
            type="button"
            onClick={onLinkOwnWorkout}
            className="shrink-0 rounded-[6px] px-3 py-1.5 font-sans text-[12px] font-semibold"
            style={{ background: "var(--accent)", color: "var(--bg)" }}
          >
            Link workout
          </button>
        </div>
      )}

      <ul className="flex flex-col gap-1">
        {rows.map((p) => {
          const name = p.display_name || p.guest_name || "Guest";
          const isGuest = p.user_id == null;
          return (
            <li
              key={p.id}
              className="flex items-center gap-3 rounded-[8px] px-3 py-2"
              style={{
                background: "transparent",
                border: "1px dashed var(--border)",
              }}
            >
              <AvatarMonogram
                name={name}
                seed={p.user_id ?? p.guest_name ?? p.id}
                isGuest={isGuest}
                size="sm"
              />
              <span
                className="min-w-0 flex-1 truncate font-sans text-[13px]"
                style={{ color: "var(--muted)" }}
              >
                {name}
                {isGuest && (
                  <span
                    className="ml-1.5 rounded-full px-1.5 py-0.5 font-mono text-[9px]"
                    style={{
                      border: "1px dashed var(--border)",
                      color: "var(--muted)",
                    }}
                  >
                    guest
                  </span>
                )}
              </span>
              {p.role && (
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px]"
                  style={{
                    background: "var(--surface)",
                    color: "var(--muted)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {p.role}
                </span>
              )}
              <ParticipantRowMenu
                participant={p}
                isCreator={isCreator}
                currentUserId={currentUserId}
                onLinkWorkout={() => onLinkWorkout(p)}
                onChangeRole={() => onChangeRole(p)}
                onRemove={() => onRemove(p)}
                onLeave={() => onLeave(p)}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
