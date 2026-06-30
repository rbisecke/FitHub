"use client";

import { relativeDate } from "@/lib/display";

interface DateGroupHeaderProps {
  date: string;
  count: number;
}

export function DateGroupHeader({ date, count }: DateGroupHeaderProps) {
  const [y, mo, d] = date.split("-").map(Number) as [number, number, number];
  const dateObj = new Date(y, mo - 1, d);
  const label = dateObj.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const rel = relativeDate(date);

  return (
    <div className="flex items-center gap-3 mt-[18px] mb-3 pl-[38px]">
      <span className="text-[12px] font-bold text-[var(--foreground)] shrink-0">
        {label}
      </span>
      {rel !== label && (
        <span className="text-[11px] text-[var(--muted-foreground)] shrink-0">
          {rel}
        </span>
      )}
      <div className="flex-1 h-px bg-[var(--border)]" />
      <span className="text-[11px] text-[var(--muted-foreground)] shrink-0">
        {count === 1 ? "1 logged" : `${count} logged`}
      </span>
    </div>
  );
}
