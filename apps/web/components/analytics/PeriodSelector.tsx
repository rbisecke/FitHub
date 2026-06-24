"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

export interface PeriodOption {
  label: string;
  value: string;
}

interface PeriodSelectorProps {
  options: PeriodOption[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

export function PeriodSelector({
  options,
  value,
  onChange,
  label,
}: PeriodSelectorProps) {
  const selectId = `period-${
    label?.toLowerCase().replace(/\s+/g, "-") ?? "selector"
  }`;
  return (
    <>
      {/* Mobile: compact dropdown */}
      <div className="md:hidden">
        {label && (
          <label htmlFor={selectId} className="sr-only">
            {label}
          </label>
        )}
        <Select
          value={value}
          onValueChange={(v) => {
            if (v !== null) onChange(v);
          }}
        >
          <SelectTrigger
            id={selectId}
            className="h-7 text-xs w-auto gap-1 border-[--border] bg-[--surface] text-[--muted]"
          >
            {options.find((o) => o.value === value)?.label ?? value}
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {/* Desktop: button row */}
      <div
        className="hidden md:flex items-center gap-1"
        role="group"
        aria-label={label ?? "Period selector"}
      >
        {options.map((opt) => (
          <Button
            key={opt.value}
            variant={value === opt.value ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs px-2"
            onClick={() => onChange(opt.value)}
            aria-pressed={value === opt.value}
          >
            {opt.label}
          </Button>
        ))}
      </div>
    </>
  );
}
