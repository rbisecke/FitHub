export function DateSeparator({ date }: { date: string }) {
  const [y, mo, d] = date.split("-").map(Number) as [number, number, number];
  const dateObj = new Date(y, mo - 1, d);

  const month = dateObj.toLocaleDateString("en-US", { month: "short" });
  const day = dateObj.getDate();
  const year = dateObj.getFullYear();
  const weekday = dateObj.toLocaleDateString("en-US", { weekday: "long" });
  const label = `${month} ${day}, ${year} (${weekday})`;

  return (
    <div className="flex items-center gap-3 mb-3">
      <div className="flex-1 border-t border-[#30363d]" />
      <span className="text-xs font-mono text-[#8b949e] shrink-0">{label}</span>
      <div className="flex-1 border-t border-[#30363d]" />
    </div>
  );
}
