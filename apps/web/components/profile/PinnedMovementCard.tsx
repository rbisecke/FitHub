import type { PinnedMovement } from "@/lib/api";

const MODALITY_CHIP: Record<string, string> = {
  strength: "bg-[#bc8cff]/10 text-[#bc8cff] border-[#bc8cff]/30",
  weightlifting: "bg-[#58a6ff]/10 text-[#58a6ff] border-[#58a6ff]/30",
  mono_structural: "bg-[#3fb950]/10 text-[#3fb950] border-[#3fb950]/30",
  gymnastics: "bg-[#d29922]/10 text-[#d29922] border-[#d29922]/30",
  plyometric: "bg-[#ff7b72]/10 text-[#ff7b72] border-[#ff7b72]/30",
  carry: "bg-[#d29922]/10 text-[#d29922] border-[#d29922]/30",
  strongman: "bg-[#ff7b72]/10 text-[#ff7b72] border-[#ff7b72]/30",
};

function formatPR(pr: Record<string, unknown> | null | undefined): string {
  if (!pr) return "—";

  if (typeof pr.load_kg === "number") {
    return `${pr.load_kg} kg`;
  }
  if (typeof pr.time_s === "number") {
    const mins = Math.floor(pr.time_s / 60);
    const secs = Math.floor(pr.time_s % 60);
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  if (typeof pr.distance_m === "number") {
    return `${(pr.distance_m / 1000).toFixed(2)} km`;
  }
  if (typeof pr.reps === "number") {
    return `${pr.reps} reps`;
  }
  return "—";
}

interface PinnedMovementCardProps {
  movement: PinnedMovement;
}

export function PinnedMovementCard({ movement }: PinnedMovementCardProps) {
  const prDisplay = formatPR(
    movement.personal_record as Record<string, unknown> | null,
  );
  const chipClass =
    MODALITY_CHIP[movement.modality] ??
    "bg-[#8b949e]/10 text-[#8b949e] border-[#8b949e]/30";

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 space-y-1 min-h-[88px]">
      <p className="font-sans text-sm font-medium text-[#e6edf3] leading-tight line-clamp-2">
        {movement.movement_name}
      </p>
      <p
        className={`font-mono text-lg leading-tight ${
          prDisplay === "—" ? "text-[#8b949e]" : "text-[#e6edf3]"
        }`}
      >
        {prDisplay}
      </p>
      <span
        className={`inline-block text-[10px] font-mono uppercase tracking-wide border rounded px-1.5 py-0.5 ${chipClass}`}
      >
        {movement.modality}
      </span>
    </div>
  );
}
