"use client";

interface Props {
  zone: string;
  acwr: number | null;
}

const ZONE_CONFIG: Record<string, { label: string; className: string }> = {
  sweet_spot: {
    label: "Optimal load",
    className:
      "bg-[var(--green)]/10 text-[var(--green)] border border-[var(--green)]/30",
  },
  undertraining: {
    label: "Room to increase",
    className:
      "bg-[var(--amber)]/10 text-[var(--amber)] border border-[var(--amber)]/30",
  },
  caution: {
    label: "High load — watch recovery",
    className:
      "bg-[var(--amber)]/10 text-[var(--amber)] border border-[var(--amber)]/30",
  },
  overreaching: {
    label: "Reduce intensity",
    className:
      "bg-[var(--red)]/10 text-[var(--red)] border border-[var(--red)]/30",
  },
  insufficient_data: {
    label: "Not enough data yet",
    className:
      "bg-[var(--surface)] text-[var(--muted)] border border-[var(--border)]",
  },
};

export function ACWRZone({ zone, acwr }: Props) {
  const config = ZONE_CONFIG[zone] ?? ZONE_CONFIG["insufficient_data"]!;

  return (
    <div data-testid="acwr-zone" className="flex items-center gap-3">
      <span
        className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium ${config.className}`}
      >
        {config.label}
      </span>
      {acwr !== null && (
        <span className="font-mono text-xs text-[var(--muted)]">
          ACWR {acwr.toFixed(2)}
        </span>
      )}
    </div>
  );
}
