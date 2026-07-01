import type { PlannedSessionOut } from "@/lib/api/plans";

function getSessionStyle(type: string | undefined): {
  bg: string;
  text: string;
  label: string;
} {
  const key = type ?? "rest";
  return SESSION_TYPE_STYLES[key] ?? DEFAULT_SESSION_STYLE;
}

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

const DEFAULT_SESSION_STYLE = {
  bg: "bg-[var(--surface-2)] border-[var(--border)]",
  text: "text-[var(--muted)]",
  label: "Session",
};

const SESSION_TYPE_STYLES: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  strength: {
    bg: "bg-[rgba(88,166,255,0.12)] border-[rgba(88,166,255,0.3)]",
    text: "text-[var(--blue)]",
    label: "Strength",
  },
  metcon: {
    bg: "bg-[rgba(255,122,69,0.12)] border-[rgba(255,122,69,0.3)]",
    text: "text-[var(--hot)]",
    label: "Metcon",
  },
  cardio: {
    bg: "bg-[rgba(74,222,128,0.12)] border-[rgba(74,222,128,0.3)]",
    text: "text-[var(--accent)]",
    label: "Cardio",
  },
  skill: {
    bg: "bg-[rgba(255,200,61,0.12)] border-[rgba(255,200,61,0.3)]",
    text: "text-[var(--gold)]",
    label: "Skill",
  },
  mixed: {
    bg: "bg-[rgba(88,166,255,0.12)] border-[rgba(88,166,255,0.3)]",
    text: "text-[var(--blue)]",
    label: "Mixed",
  },
  active_recovery: {
    bg: "bg-[rgba(74,222,128,0.08)] border-[rgba(74,222,128,0.2)]",
    text: "text-[var(--accent)]",
    label: "Recovery",
  },
  rest: {
    bg: "bg-[var(--surface-2)] border-[var(--border)]",
    text: "text-[var(--muted)]",
    label: "Rest",
  },
};

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
    const dateKey = date.toISOString().slice(0, 10);
    const session = sessionByDate.get(dateKey);
    const isToday = date.toDateString() === today.toDateString();
    const isPast = date < today;
    const sessionStyle = getSessionStyle(session?.session_type);
    return { date, dateKey, session, isToday, isPast, sessionStyle };
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
        {days.map(({ date, session, isToday, isPast, sessionStyle }, i) => {
          let statusEl: React.ReactNode = null;
          if (session) {
            if (session.status === "completed") {
              statusEl = (
                <span className="font-data text-[11px] text-[var(--accent)]">
                  Completed ✓
                </span>
              );
            } else if (isPast) {
              statusEl = (
                <span className="font-data text-[11px] text-[var(--hot)]">
                  Missed ✕
                </span>
              );
            } else {
              statusEl = (
                <span className="font-data text-[11px] text-[var(--muted)]">
                  Scheduled
                </span>
              );
            }
          }

          return (
            <div
              key={i}
              className={[
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors",
                isToday
                  ? "bg-[rgba(74,222,128,0.06)] border border-[rgba(74,222,128,0.2)]"
                  : "border border-transparent",
              ].join(" ")}
            >
              <div className="w-20 flex-shrink-0">
                <div
                  className={`font-sans text-[13px] font-semibold ${
                    isToday
                      ? "text-[var(--accent)]"
                      : "text-[var(--foreground)]"
                  }`}
                >
                  {DAY_NAMES[i]}
                </div>
                <div className="font-data text-[11px] text-[var(--muted)] tabular-nums">
                  {formatDayDate(date)}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                {session ? (
                  <div className="font-sans text-[13px] text-[var(--foreground)] truncate">
                    {session.title}
                  </div>
                ) : (
                  <div className="font-data text-[12px] text-[var(--muted)]">
                    Rest day
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {session && (
                  <span
                    className={`text-[11px] font-semibold border px-2 py-0.5 rounded-full ${sessionStyle.bg} ${sessionStyle.text}`}
                  >
                    {sessionStyle.label}
                  </span>
                )}
                {statusEl}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
