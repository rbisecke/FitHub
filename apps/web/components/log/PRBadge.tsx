"use client";

type SetType = "warmup" | "working" | "drop";

interface PRBadgeProps {
  estimatedOneRM: number | null; // from E1RMGhost — null means hidden
  prThreshold: number | null; // estimated_1rm_kg from personalRecord API — null = no prior PR
  setType: SetType;
}

export function PRBadge({
  estimatedOneRM,
  prThreshold,
  setType,
}: PRBadgeProps) {
  if (
    setType !== "working" ||
    estimatedOneRM === null ||
    prThreshold === null ||
    estimatedOneRM <= prThreshold
  ) {
    return null;
  }

  return (
    <span className="bg-[#3fb950]/10 text-[#3fb950] border border-[#3fb950]/30 font-mono text-xs px-1.5 py-0.5 rounded">
      [PR]
    </span>
  );
}
