type Zone =
  | "sweet_spot"
  | "undertraining"
  | "caution"
  | "overreaching"
  | "insufficient_data";

interface ZoneBannerProps {
  zone: Zone | string;
  acwr: number | null;
  note?: string;
}

const ZONE_CONFIG: Record<
  string,
  { label: string; color: string; border: string; bg: string }
> = {
  sweet_spot: {
    label: "Building Phase",
    color: "var(--accent)",
    border: "rgba(74,222,128,0.3)",
    bg: "rgba(74,222,128,0.08)",
  },
  undertraining: {
    label: "Low Load",
    color: "var(--blue)",
    border: "rgba(88,166,255,0.3)",
    bg: "rgba(88,166,255,0.08)",
  },
  caution: {
    label: "High Load",
    color: "var(--gold)",
    border: "rgba(255,200,61,0.3)",
    bg: "rgba(255,200,61,0.08)",
  },
  overreaching: {
    label: "Overreaching",
    color: "var(--hot)",
    border: "rgba(255,122,69,0.3)",
    bg: "rgba(255,122,69,0.08)",
  },
  insufficient_data: {
    label: "Still calibrating",
    color: "var(--muted-foreground)",
    border: "var(--border)",
    bg: "transparent",
  },
};

function buildZoneNote(zone: string, acwr: number | null): string {
  const val = acwr !== null ? acwr.toFixed(2) : null;
  if (zone === "sweet_spot")
    return val
      ? `ACWR ${val} — load is optimal, fitness is climbing steadily.`
      : "Load is optimal, fitness is climbing steadily.";
  if (zone === "undertraining")
    return val
      ? `ACWR ${val} — room to push harder without accumulating injury risk.`
      : "Room to push harder without accumulating injury risk.";
  if (zone === "caution")
    return val
      ? `ACWR ${val} — you're on the edge of high load. Watch recovery this week.`
      : "You're on the edge of high load. Watch recovery this week.";
  if (zone === "overreaching")
    return val
      ? `ACWR ${val} — carrying high load. Ease up and bank the fitness gains.`
      : "Carrying high load. Ease up and bank the fitness gains.";
  return "Log more sessions to calibrate your training load.";
}

export function ZoneBanner({ zone, acwr, note }: ZoneBannerProps) {
  const config = ZONE_CONFIG[zone] ?? ZONE_CONFIG["insufficient_data"]!;
  const displayNote = note ?? buildZoneNote(zone, acwr);

  return (
    <div
      className="flex flex-row items-start gap-3.5 rounded-[14px] px-4 py-3.5 mb-[18px]"
      style={{
        border: `1px solid ${config.border}`,
        background: config.bg,
      }}
    >
      <div
        className="h-2 w-2 rounded-full flex-shrink-0 mt-[3px]"
        style={{ backgroundColor: config.color }}
      />
      <div>
        <div className="text-[14px] font-bold" style={{ color: config.color }}>
          {config.label}
        </div>
        <div className="text-[12px] text-[var(--muted-foreground)] mt-0.5">
          {displayNote}
        </div>
      </div>
    </div>
  );
}
