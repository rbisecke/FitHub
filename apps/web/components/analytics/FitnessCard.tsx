"use client";

interface Props {
  ctl: number;
  atl: number;
  tsb: number;
}

function tsbColor(tsb: number): string {
  if (tsb > 0) return "text-emerald-400";
  if (tsb >= -10) return "text-amber-400";
  return "text-red-400";
}

export function FitnessCard({ ctl, atl, tsb }: Props) {
  return (
    <div
      data-testid="fitness-card"
      className="grid grid-cols-3 gap-4 rounded-lg border border-zinc-800 bg-zinc-900 p-4"
    >
      <div className="text-center">
        <p className="font-mono text-xs text-zinc-500">Fitness</p>
        <p className="mt-1 text-2xl font-semibold text-zinc-100">
          {ctl.toFixed(1)}
        </p>
        <p className="font-mono text-xs text-zinc-600">CTL</p>
      </div>
      <div className="text-center">
        <p className="font-mono text-xs text-zinc-500">Fatigue</p>
        <p className="mt-1 text-2xl font-semibold text-zinc-100">
          {atl.toFixed(1)}
        </p>
        <p className="font-mono text-xs text-zinc-600">ATL</p>
      </div>
      <div className="text-center">
        <p className="font-mono text-xs text-zinc-500">Form</p>
        <p className={`mt-1 text-2xl font-semibold ${tsbColor(tsb)}`}>
          {tsb > 0 ? "+" : ""}
          {tsb.toFixed(1)}
        </p>
        <p className="font-mono text-xs text-zinc-600">TSB</p>
      </div>
    </div>
  );
}
