import Link from "next/link";
import type { PlannedSessionOut } from "@/lib/api/plans";

function getWeekRange(): { start: Date; end: Date } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayOfWeek = today.getDay();
  const offsetToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const start = new Date(today);
  start.setDate(today.getDate() + offsetToMonday);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start, end };
}

// Map session type to our token system.
const SESSION_TYPE_CONFIG: Record<string, { token: string; label: string }> = {
  strength: { token: "var(--green)", label: "Strength" },
  metcon: { token: "var(--amber)", label: "Conditioning" },
  skill: { token: "var(--accent)", label: "Skill" },
  mixed: { token: "var(--purple)", label: "Mixed" },
  active_recovery: { token: "var(--muted)", label: "Recovery" },
  rest: { token: "var(--muted)", label: "Rest" },
};

const DEFAULT_SESSION_CONFIG = { token: "var(--muted)", label: "Session" };

const DAY_ABBR = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

function formatDayDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface Props {
  sessions: PlannedSessionOut[];
}

export function CurrentWeekView({ sessions }: Props) {
  const { start, end } = getWeekRange();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sessionByDate = new Map<string, PlannedSessionOut>();
  for (const s of sessions) {
    sessionByDate.set(s.scheduled_date, s);
  }

  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const dateKey = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");
    const session = sessionByDate.get(dateKey);
    const isToday = date.toDateString() === today.toDateString();
    const isPast = date < today;
    const isDone = session?.status === "completed";
    return { date, dateKey, session, isToday, isPast, isDone };
  });

  // only show if any sessions in range
  const hasAny = days.some((d) => d.session);
  if (!hasAny) return null;

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 animate-fadeUp">
      <div className="flex items-center justify-between mb-4">
        <span className="font-heading text-[15px] text-[var(--foreground)]">
          This week
        </span>
        <span className="font-data text-[11px] text-[var(--muted)]">
          {formatDayDate(start)} – {formatDayDate(end)}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {days.map(({ date, dateKey, session, isToday, isPast, isDone }, i) => {
          const typeCfg =
            SESSION_TYPE_CONFIG[session?.session_type ?? ""] ??
            DEFAULT_SESSION_CONFIG;

          // Day pill color based on session state.
          let dayPillBg: string;
          let dayPillText: string;
          if (isDone) {
            dayPillBg = "var(--green)";
            dayPillText = "var(--bg)";
          } else if (isToday) {
            dayPillBg = "color-mix(in srgb, var(--accent) 18%, transparent)";
            dayPillText = "var(--accent)";
          } else {
            dayPillBg = "color-mix(in srgb, var(--muted) 12%, transparent)";
            dayPillText = "var(--muted)";
          }

          // Status badge.
          let statusText: string;
          let statusColor: string;
          let statusBg: string;
          if (!session) {
            statusText = "";
            statusColor = "var(--muted)";
            statusBg = "transparent";
          } else if (isDone) {
            statusText = "Done ✓";
            statusColor = "var(--green)";
            statusBg = "color-mix(in srgb, var(--green) 12%, transparent)";
          } else if (isToday) {
            statusText = "Today";
            statusColor = "var(--bg)";
            statusBg = "var(--accent)";
          } else {
            statusText = isPast ? "Missed" : "Upcoming";
            statusColor = "var(--muted)";
            statusBg = "color-mix(in srgb, var(--muted) 12%, transparent)";
          }

          // CTA text.
          const ctaText = isToday ? "Log session · start now" : "Log session";

          return (
            <div
              key={dateKey}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors"
              style={{
                border: isToday
                  ? "1px solid color-mix(in srgb, var(--accent) 45%, transparent)"
                  : "1px solid transparent",
                boxShadow: isToday
                  ? "0 0 0 1px color-mix(in srgb, var(--accent) 15%, transparent)"
                  : "none",
              }}
            >
              {/* Day pill */}
              <div
                className="flex-shrink-0 flex flex-col items-center justify-center font-data tabular-nums text-[11px] font-bold rounded-lg"
                style={{
                  width: 44,
                  height: 44,
                  background: dayPillBg,
                  color: dayPillText,
                }}
                aria-label={`${DAY_NAMES[i]}, ${formatDayDate(date)}`}
              >
                <span className="text-[10px] uppercase tracking-wide">
                  {DAY_ABBR[i]}
                </span>
                <span className="text-[13px] leading-tight">
                  {date.getDate()}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                {session ? (
                  <>
                    <div className="font-sans text-[13px] text-[var(--foreground)] truncate">
                      {session.title}
                    </div>
                    {/* Session type badge */}
                    <span
                      className="inline-block mt-0.5 font-sans text-[10px] font-bold uppercase tracking-[0.5px] rounded px-1.5 py-0"
                      style={{
                        color: typeCfg.token,
                        background: `color-mix(in srgb, ${typeCfg.token} 14%, transparent)`,
                        border: `1px solid color-mix(in srgb, ${typeCfg.token} 32%, transparent)`,
                      }}
                    >
                      {typeCfg.label}
                    </span>
                  </>
                ) : (
                  <div className="font-data text-[12px] text-[var(--muted)]">
                    Rest day
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {session && statusText && (
                  <span
                    className="font-data text-[11px] font-semibold rounded px-1.5 py-0.5"
                    style={{ color: statusColor, background: statusBg }}
                  >
                    {statusText}
                  </span>
                )}
                {session && !isDone && (
                  <Link
                    href={`/plans/${session.mesocycle_id}`}
                    className="font-data text-[11px] rounded px-2 py-1 transition-opacity hover:opacity-80"
                    style={{
                      background: isToday
                        ? "var(--accent)"
                        : "color-mix(in srgb, var(--muted) 15%, transparent)",
                      color: isToday ? "var(--bg)" : "var(--muted)",
                      minHeight: 28,
                      display: "inline-flex",
                      alignItems: "center",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {ctaText}
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
