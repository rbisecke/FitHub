"use client";

interface E1RMGhostProps {
  loadKg: number | null;
  reps: number | null;
}

export function E1RMGhost({ loadKg, reps }: E1RMGhostProps) {
  if (!loadKg || !reps || reps === 0 || reps > 10) return null;
  const e1rm = Math.round(loadKg * (1 + reps / 30));
  return (
    <span className="font-mono text-xs text-[#8b949e] whitespace-nowrap">
      ~{e1rm} kg
    </span>
  );
}
