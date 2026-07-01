import type { MesocycleOut, PlannedSessionOut } from "@/lib/api/plans";

type DotStyle = {
  bg: string;
  ring?: boolean;
  dashed?: boolean;
  faded?: boolean;
};

function getDotStyle(
  session: PlannedSessionOut | undefined,
  date: Date,
  today: Date,
): DotStyle {
  const isToday = date.toDateString() === today.toDateString();
  const isPast = date < today && !isToday;

  if (!session) {
    if (date > today) {
      return { bg: "bg-transparent", dashed: true };
    }
    return { bg: "bg-[var(--border)]", faded: true };
  }

  const typeMap: Record<string, string> = {
    strength: "bg-[var(--blue)]",
    metcon: "bg-[var(--hot)]",
    cardio: "bg-[var(--accent)]",
    skill: "bg-[var(--gold)]",
    mixed: "bg-[var(--purple)]",
    active_recovery: "bg-[var(--accent)]",
    rest: "bg-[var(--border)]",
  };

  const bg = typeMap[session.session_type] ?? "bg-[var(--muted)]";
  return { bg, ring: isToday, faded: isPast && session.status !== "completed" };
}

const LEGEND_ITEMS: { label: string; className: string }[] = [
  { label: "Strength", className: "bg-[var(--blue)]" },
  { label: "Metcon", className: "bg-[var(--hot)]" },
  { label: "Cardio", className: "bg-[var(--accent)]" },
  { label: "Skill", className: "bg-[var(--gold)]" },
  { label: "Rest", className: "bg-[var(--border)]" },
];

interface Props {
  mesocycles: MesocycleOut[];
  sessions: PlannedSessionOut[];
  startDate: string;
  weeks: number;
}

export function MesocycleDotGrid({ sessions, startDate, weeks }: Props) {
  const today = new Date();
  const planStart = new Date(startDate);
  planStart.setHours(0, 0, 0, 0);

  const sessionByDate = new Map<string, PlannedSessionOut>();
  for (const s of sessions) {
    sessionByDate.set(s.scheduled_date, s);
  }

  const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 animate-fadeUp">
      <div className="flex items-center justify-between mb-4">
        <span className="font-heading text-[15px] text-[var(--foreground)]">
          Mesocycle overview
        </span>
        <span className="font-data text-[12px] text-[var(--muted)] tabular-nums">
          {weeks}w
        </span>
      </div>

      {/* Day header */}
      <div className="grid grid-cols-7 gap-2 mb-1">
        {DAY_LABELS.map((d) => (
          <div
            key={d}
            className="text-center font-data text-[9px] text-[var(--muted)] uppercase tracking-wide"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Week rows */}
      <div className="flex flex-col gap-2">
        {Array.from({ length: weeks }, (_, weekIdx) => {
          const weekStart = new Date(planStart);
          weekStart.setDate(planStart.getDate() + weekIdx * 7);
          // Adjust to Monday of that week
          const dayOfWeek = weekStart.getDay();
          const offsetToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
          weekStart.setDate(weekStart.getDate() + offsetToMonday);

          return (
            <div key={weekIdx} className="flex items-center gap-2">
              <span className="font-data text-[9px] text-[var(--muted)] w-6 flex-shrink-0 tabular-nums">
                W{weekIdx + 1}
              </span>
              <div className="grid grid-cols-7 gap-2 flex-1">
                {Array.from({ length: 7 }, (_, dayIdx) => {
                  const date = new Date(weekStart);
                  date.setDate(weekStart.getDate() + dayIdx);
                  const dateKey = date.toISOString().slice(0, 10);
                  const session = sessionByDate.get(dateKey);
                  const { bg, ring, dashed, faded } = getDotStyle(
                    session,
                    date,
                    today,
                  );

                  return (
                    <div
                      key={dayIdx}
                      title={
                        session ? `${session.title} · ${dateKey}` : dateKey
                      }
                      className={[
                        "w-[22px] h-[22px] rounded-full mx-auto transition-all",
                        bg,
                        dashed
                          ? "border border-dashed border-[var(--border)]"
                          : "",
                        ring
                          ? "ring-2 ring-[var(--accent)] ring-offset-1 ring-offset-[var(--background)] animate-glow"
                          : "",
                        faded ? "opacity-50" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4 pt-4 border-t border-[var(--border)]">
        {LEGEND_ITEMS.map(({ label, className }) => (
          <span
            key={label}
            className="flex items-center gap-1.5 text-[11px] text-[var(--muted)]"
          >
            <span
              className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${className}`}
            />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
