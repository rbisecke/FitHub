"use client";

import { SetTypeBadge } from "./SetTypeBadge";
import { E1RMGhost } from "./E1RMGhost";
import { PRBadge } from "./PRBadge";
import { Input } from "@/components/ui/input";

type SetType = "warmup" | "working" | "drop";

interface SetRowProps {
  setNumber: number;
  setType: SetType;
  loadDisplay: string;
  reps: string;
  weightUnit: "kg" | "lb";
  onSetTypeChange: (t: SetType) => void;
  onLoadChange: (v: string) => void;
  onRepsChange: (v: string) => void;
  /** Pre-computed estimated 1RM in kg (null when hidden). Provided by SetTable to avoid double-computing. */
  estimatedOneRM?: number | null;
  /** PR threshold from personalRecord API (estimated_1rm_kg). null = no prior PR on record. */
  prThreshold?: number | null;
  /** Set type forwarded to PRBadge — same as setType, kept separate so callers are explicit. */
  setTypeBadgeForPR?: SetType;
}

const INPUT_CLS =
  "h-9 bg-[#0d1117] border-[#30363d] text-[#e6edf3] font-mono text-sm placeholder:text-[#8b949e]";

export function SetRow({
  setNumber,
  setType,
  loadDisplay,
  reps,
  weightUnit,
  onSetTypeChange,
  onLoadChange,
  onRepsChange,
  estimatedOneRM,
  prThreshold = null,
  setTypeBadgeForPR,
}: SetRowProps) {
  // If estimatedOneRM not provided externally, compute it here (standalone usage)
  const loadKg =
    weightUnit === "lb" ? Number(loadDisplay) / 2.20462 : Number(loadDisplay);
  const repsNum = isNaN(parseInt(reps, 10)) ? null : parseInt(reps, 10);
  const e1rm =
    estimatedOneRM !== undefined
      ? estimatedOneRM
      : loadKg && repsNum && repsNum > 0 && repsNum <= 10
        ? Math.round(loadKg * (1 + repsNum / 30))
        : null;

  return (
    <div className="grid grid-cols-[2rem_1fr_1fr_2.5rem_auto] gap-2 items-center">
      <span className="font-mono text-xs text-[#8b949e] text-right">
        #{setNumber}
      </span>
      <div className="relative">
        <Input
          type="number"
          step={0.5}
          min={0}
          max={1000}
          placeholder="0"
          aria-label={`Set ${setNumber} weight in ${weightUnit}`}
          value={loadDisplay}
          onChange={(e) => onLoadChange(e.target.value)}
          className={`${INPUT_CLS} pr-8`}
        />
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 font-mono text-xs text-[#8b949e]">
          {weightUnit}
        </span>
      </div>
      <Input
        type="number"
        min={1}
        max={9999}
        placeholder="0"
        aria-label={`Set ${setNumber} reps`}
        value={reps}
        onChange={(e) => onRepsChange(e.target.value)}
        className={INPUT_CLS}
      />
      <SetTypeBadge value={setType} onChange={onSetTypeChange} />
      <div className="flex items-center gap-1.5 min-w-0">
        <E1RMGhost loadKg={loadKg || null} reps={repsNum} />
        <PRBadge
          estimatedOneRM={e1rm}
          prThreshold={prThreshold}
          setType={setTypeBadgeForPR ?? setType}
        />
      </div>
    </div>
  );
}
