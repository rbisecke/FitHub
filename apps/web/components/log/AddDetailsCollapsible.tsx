"use client";

import { useState } from "react";
import type {
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
} from "react-hook-form";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import type { LogFormValues } from "./schema";

const SESSION_TYPES = [
  "strength",
  "metcon",
  "skill",
  "mixed",
  "rest",
  "deload",
  "active_recovery",
] as const;

const SESSION_LABELS: Record<string, string> = {
  strength: "Strength",
  metcon: "Metcon",
  skill: "Skill",
  mixed: "Mixed",
  rest: "Rest",
  deload: "Deload",
  active_recovery: "Active Recovery",
};

const WORKOUT_FORMATS = [
  "strength",
  "amrap",
  "emom",
  "for_time",
  "tabata",
  "intervals",
  "chipper",
  "benchmark",
  "open",
  "partner",
  "team",
] as const;

const FORMAT_LABELS: Record<string, string> = {
  strength: "Strength",
  amrap: "AMRAP",
  emom: "EMOM",
  for_time: "For Time",
  tabata: "Tabata",
  intervals: "Intervals",
  chipper: "Chipper",
  benchmark: "Benchmark",
  open: "Open WOD",
  partner: "Partner",
  team: "Team",
};

const SELECT_CLS =
  "w-full rounded-md border border-[#30363d] bg-[#0d1117] px-3 py-1.5 pr-8 text-sm text-[#e6edf3] focus:border-[#58a6ff] focus:outline-none appearance-none";

const CHEVRON = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16' fill='none'%3E%3Cpath d='M4 6l4 4 4-4' stroke='%238b949e' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
  backgroundRepeat: "no-repeat" as const,
  backgroundPosition: "right 0.5rem center",
  backgroundSize: "1rem 1rem",
};

const INPUT_CLS =
  "h-9 bg-[#0d1117] border-[#30363d] text-[#e6edf3] text-sm placeholder:text-[#8b949e]";

interface AddDetailsCollapsibleProps {
  register: UseFormRegister<LogFormValues>;
  setValue: UseFormSetValue<LogFormValues>;
  watch: UseFormWatch<LogFormValues>;
}

export function AddDetailsCollapsible({
  register,
  setValue,
  watch,
}: AddDetailsCollapsibleProps) {
  const [open, setOpen] = useState(false);
  const rpe = watch("session_rpe");

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-md border border-[#30363d] bg-[#161b22] px-3 py-2 text-sm text-[#8b949e] hover:border-[#58a6ff]/40 hover:text-[#e6edf3] transition-colors">
        <span
          className="font-mono text-xs text-[#58a6ff] transition-transform duration-200 shrink-0"
          style={{
            display: "inline-block",
            transform: open ? "rotate(90deg)" : "rotate(0deg)",
          }}
        >
          ▸
        </span>
        {open ? (
          <span>Hide details</span>
        ) : (
          <span className="text-left">
            Add details: session type · duration · RPE · notes
          </span>
        )}
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-4 space-y-4">
        {/* Date + Title */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="performed_at" className="text-xs text-[#8b949e]">
              Date
            </Label>
            <Input
              id="performed_at"
              type="date"
              {...register("performed_at")}
              className={INPUT_CLS}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="title" className="text-xs text-[#8b949e]">
              Title
            </Label>
            <Input
              id="title"
              placeholder="Back Squat + Metcon"
              {...register("title")}
              className={INPUT_CLS + " placeholder:text-[#8b949e]"}
            />
          </div>
        </div>

        {/* Session type + Format */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="session_type" className="text-xs text-[#8b949e]">
              Session type
            </Label>
            <select
              id="session_type"
              {...register("session_type")}
              className={SELECT_CLS}
              style={CHEVRON}
            >
              <option value="">Select…</option>
              {SESSION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {SESSION_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="workout_format" className="text-xs text-[#8b949e]">
              Format
            </Label>
            <select
              id="workout_format"
              {...register("workout_format")}
              className={SELECT_CLS}
              style={CHEVRON}
            >
              <option value="">Select…</option>
              {WORKOUT_FORMATS.map((f) => (
                <option key={f} value={f}>
                  {FORMAT_LABELS[f]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Duration */}
        <div className="space-y-1">
          <Label htmlFor="duration_min" className="text-xs text-[#8b949e]">
            Duration
          </Label>
          <div className="relative">
            <Input
              id="duration_min"
              type="number"
              min={1}
              max={360}
              placeholder="45"
              {...register("duration_min")}
              className={INPUT_CLS + " pr-10 placeholder:text-[#8b949e]"}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8b949e]">
              min
            </span>
          </div>
        </div>

        {/* RPE Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-[#8b949e]">Effort (RPE)</Label>
            <span className="font-mono text-xs text-[#e6edf3]">
              {rpe != null ? `RPE: ${rpe}` : "—"}
            </span>
          </div>
          <Slider
            min={0}
            max={10}
            step={0.5}
            value={rpe != null ? [rpe] : [0]}
            onValueChange={(v) => {
              const num =
                typeof v === "number" ? v : (v as readonly number[])[0];
              if (num !== undefined) setValue("session_rpe", num);
            }}
            className="w-full"
          />
        </div>

        {/* Notes */}
        <div className="space-y-1">
          <Label htmlFor="notes" className="text-xs text-[#8b949e]">
            Notes
          </Label>
          <Textarea
            id="notes"
            rows={3}
            placeholder="How did it feel? Any scaling notes?"
            {...register("notes")}
            className="bg-[#0d1117] border-[#30363d] text-[#e6edf3] text-sm placeholder:text-[#8b949e]"
          />
        </div>

        {/* Bodyweight */}
        <div className="space-y-1">
          <Label htmlFor="bodyweight_kg" className="text-xs text-[#8b949e]">
            Bodyweight
          </Label>
          <div className="relative">
            <Input
              id="bodyweight_kg"
              type="number"
              min={30}
              max={600}
              step={0.1}
              placeholder="80"
              {...register("bodyweight_kg")}
              className={INPUT_CLS + " pr-8 placeholder:text-[#8b949e]"}
            />
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 font-mono text-xs text-[#8b949e]">
              kg
            </span>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
