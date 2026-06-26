import type { E1RMPoint } from "@/lib/api";
import { projectNextPR } from "@/lib/records/projectNextPR";

interface Props {
  points: E1RMPoint[];
  currentBestKg: number;
}

export function PRProjection({ points, currentBestKg }: Props) {
  const proj = projectNextPR(points, currentBestKg);
  if (!proj) return null;

  return (
    <p className="text-xs font-mono italic text-[--muted] mt-0.5">
      On trend → {proj.targetKg.toFixed(1)} kg ~{proj.weeksOut} wk
    </p>
  );
}
