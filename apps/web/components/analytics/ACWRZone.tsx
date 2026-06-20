"use client";

interface Props {
  zone: string;
  acwr: number | null;
}

const ZONE_CONFIG: Record<string, { label: string; className: string }> = {
  sweet_spot: {
    label: "Optimal load",
    className: "bg-emerald-900/40 text-emerald-300 border border-emerald-700",
  },
  undertraining: {
    label: "Room to increase",
    className: "bg-amber-900/40 text-amber-300 border border-amber-700",
  },
  caution: {
    label: "High load — watch recovery",
    className: "bg-orange-900/40 text-orange-300 border border-orange-700",
  },
  overreaching: {
    label: "Reduce intensity",
    className: "bg-red-900/40 text-red-300 border border-red-700",
  },
  insufficient_data: {
    label: "Not enough data yet",
    className: "bg-zinc-800 text-zinc-400 border border-zinc-700",
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
        <span className="font-mono text-xs text-zinc-500">
          ACWR {acwr.toFixed(2)}
        </span>
      )}
    </div>
  );
}
