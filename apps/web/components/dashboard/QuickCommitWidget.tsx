import Link from "next/link";
import { Plus } from "lucide-react";

export function QuickCommitWidget() {
  return (
    <div className="bg-[var(--card)] border border-[rgba(74,222,128,0.3)] rounded-2xl p-5">
      <div className="font-data text-[11px] text-[var(--accent)] mb-1">
        $ git commit
      </div>
      <div className="font-bold text-[14px] mb-1">Log a result</div>
      <div className="text-[12px] text-[var(--muted)] mb-3">
        Add a new session to your training log.
      </div>
      <Link
        href="/log/new"
        className="flex items-center justify-center gap-2 bg-[var(--accent)] text-[#0A0D12] font-bold text-[13px] py-2.5 rounded-[10px] hover:brightness-110 transition-all"
      >
        <Plus className="h-3.5 w-3.5" />
        New result
      </Link>
    </div>
  );
}
