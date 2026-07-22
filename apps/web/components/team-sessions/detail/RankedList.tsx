import { AvatarMonogram } from "@/components/shared/avatar-monogram";
import { ParticipantRowMenu } from "@/components/team-sessions/detail/ParticipantRowMenu";
import { formatRankBadge, isTiedRank } from "@/lib/team-sessions/leaderboard";
import type { TeamSessionParticipant } from "@/lib/api";

/**
 * Ranked list (06 §3.4) — rank 4+ (or the flat roster for relay, which has
 * no per-person rank at all) as plain rows: rank numeral, avatar, name, role
 * chip, one score column. Never more than one metric per row.
 */
export function RankedList({
  rows,
  rankCounts,
  isRelay,
  isCreator,
  currentUserId,
  onLinkWorkout,
  onChangeRole,
  onRemove,
  onLeave,
}: {
  rows: TeamSessionParticipant[];
  rankCounts: Map<number, number>;
  isRelay: boolean;
  isCreator: boolean;
  currentUserId: string;
  onLinkWorkout: (p: TeamSessionParticipant) => void;
  onChangeRole: (p: TeamSessionParticipant) => void;
  onRemove: (p: TeamSessionParticipant) => void;
  onLeave: (p: TeamSessionParticipant) => void;
}) {
  if (rows.length === 0) return null;

  return (
    <ul className="flex flex-col gap-1">
      {rows.map((p) => {
        const name = p.display_name || p.guest_name || "Guest";
        const isGuest = p.user_id == null;
        const tied = isTiedRank(p.rank, rankCounts);
        return (
          <li
            key={p.id}
            className="flex items-center gap-3 rounded-[8px] px-3 py-2"
            style={{ background: "var(--surface)" }}
          >
            {!isRelay && p.rank != null && (
              <span
                className="w-7 shrink-0 text-right font-mono text-[13px] font-semibold tabular-nums"
                style={{ color: "var(--muted)" }}
              >
                {formatRankBadge(p.rank, tied)}
              </span>
            )}
            <AvatarMonogram
              name={name}
              seed={p.user_id ?? p.guest_name ?? p.id}
              isGuest={isGuest}
              size="sm"
            />
            <span
              className="min-w-0 flex-1 truncate font-sans text-[13px]"
              style={{ color: "var(--text)" }}
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
                  background: "var(--bg)",
                  color: "var(--muted)",
                  border: "1px solid var(--border)",
                }}
              >
                {p.role}
              </span>
            )}
            {p.score && (
              <span
                className="shrink-0 font-mono text-[13px] font-semibold tabular-nums"
                style={{ color: "var(--text)" }}
              >
                {p.score}
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
  );
}
