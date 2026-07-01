"use client";

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
      {/* Desktop: pill toggle */}
      <div
        className="hidden md:flex gap-[2px] rounded-[10px] p-[3px]"
        style={{ background: "var(--card)", border: "1px solid var(--border)" }}
        role="group"
        aria-label={label ?? "Period selector"}
      >
        {options.map((opt) => {
          const isActive = value === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              aria-pressed={isActive}
              className="font-data text-[12px] font-bold px-[15px] py-[7px] rounded-[8px] whitespace-nowrap transition-colors"
              style={
                isActive
                  ? { background: "var(--accent)", color: "rgb(10, 13, 18)" }
                  : { background: "transparent", color: "var(--muted)" }
              }
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </>
  );
}
