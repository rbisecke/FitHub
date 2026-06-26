"use client";

import { SetTypeBadge } from "./SetTypeBadge";
import { E1RMGhost } from "./E1RMGhost";
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
}: SetRowProps) {
  const loadKg =
    weightUnit === "lb" ? Number(loadDisplay) / 2.20462 : Number(loadDisplay);
  const repsNum = isNaN(parseInt(reps, 10)) ? null : parseInt(reps, 10);

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-xs text-[#8b949e] w-6 text-right">
        #{setNumber}
      </span>
      <SetTypeBadge value={setType} onChange={onSetTypeChange} />
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
          className={`${INPUT_CLS} pr-8 w-24`}
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
        className={`${INPUT_CLS} w-16`}
      />
      <E1RMGhost loadKg={loadKg || null} reps={repsNum} />
    </div>
  );
}
