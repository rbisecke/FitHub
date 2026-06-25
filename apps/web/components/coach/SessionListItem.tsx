import { cn } from "@/lib/utils";

interface SessionListItemProps {
  id: string;
  title: string;
  createdAt: string;
  isActive: boolean;
  onSelect: (id: string) => void;
}

function formatRelativeDate(iso: string): string {
  try {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "today";
    if (diffDays === 1) return "yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export function SessionListItem({
  id,
  title,
  createdAt,
  isActive,
  onSelect,
}: SessionListItemProps) {
  return (
    <button
      className={cn(
        "w-full text-left px-3 py-2.5 rounded-md font-mono text-xs transition-colors border-l-2",
        isActive
          ? "border-[#58a6ff] bg-[#161b22] text-[#e6edf3]"
          : "border-transparent text-[#8b949e] hover:bg-[#161b22]/50 hover:text-[#e6edf3]",
      )}
      onClick={() => onSelect(id)}
    >
      <span className="block truncate">{title || "untitled session"}</span>
      <span className="block text-[#8b949e] text-[10px] mt-0.5">
        {formatRelativeDate(createdAt)}
      </span>
    </button>
  );
}
