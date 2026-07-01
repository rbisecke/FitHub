"use client";

interface DateGroupHeaderProps {
  date: string;
  count: number;
}

function relLabel(dateStr: string): string {
  const [y, mo, d] = dateStr.split("-").map(Number) as [number, number, number];
  const dateObj = new Date(y, mo - 1, d);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (isSameDay(dateObj, today)) return "today";
  if (isSameDay(dateObj, yesterday)) return "yesterday";
  return dateObj.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
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

  return (
    <div className="flex items-center gap-3 mt-[18px] mb-3 pl-[38px]">
      <span className="text-[12px] font-bold text-[var(--foreground)] shrink-0">
        {label}
      </span>
      <span className="text-[11px] text-[var(--muted-foreground)] shrink-0">
        {relLabel(date)}
      </span>
      <div className="flex-1 h-px bg-[var(--border)]" />
      <span className="text-[11px] text-[var(--muted-foreground)] shrink-0">
        {count === 1 ? "1 logged" : `${count} logged`}
      </span>
    </div>
  );
}
