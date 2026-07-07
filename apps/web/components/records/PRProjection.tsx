import type { E1RMPoint } from "@/lib/api";
import { projectNextPR } from "@/lib/records/projectNextPR";
import { formatWeight } from "@/lib/display";

interface Props {
  points: E1RMPoint[];
  currentBestKg: number;
  weightUnit?: string;
}

export function PRProjection({
  points,
  currentBestKg,
  weightUnit = "kg",
}: Props) {
  const proj = projectNextPR(points, currentBestKg);
  if (!proj) return null;
  const unit = weightUnit === "lb" ? "lb" : "kg";

  return (
    <p className="text-xs font-mono italic text-[--muted] mt-0.5">
      On trend → {formatWeight(proj.targetKg, unit)} ~{proj.weeksOut} wk
    </p>
  );
}
