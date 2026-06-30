"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getPageMeta } from "./nav-config";

interface Props {
  streak?: number;
  branch?: string;
}

export function DesktopHeader({ streak = 0, branch = "main" }: Props) {
  const pathname = usePathname();
  const { title, gitCommand } = getPageMeta(pathname);

  return (
    <header className="hidden md:flex sticky top-0 z-40 items-center justify-between h-14 px-6 bg-[var(--background)] border-b border-[var(--border)]">
      {/* Left: git breadcrumb */}
      <div>
        <p className="font-mono text-[10px] text-[var(--muted)] leading-none mb-0.5">
          {gitCommand}
        </p>
        <p className="font-heading text-[22px] text-[var(--text)] leading-none tracking-[-0.03em]">
          {title}
        </p>
      </div>

      {/* Right: branch pill + streak badge + CTA */}
      <div className="flex items-center gap-3">
        {/* Branch pill */}
        <span className="font-data text-[12px] font-semibold text-[var(--blue)] bg-[rgba(88,166,255,0.12)] border border-[rgba(88,166,255,0.3)] px-[11px] py-1 rounded-full whitespace-nowrap">
          ● {branch}
        </span>

        {/* Streak badge — only when streak > 0 */}
        {streak > 0 && (
          <span className="font-data text-[12px] font-bold text-[var(--hot)] bg-[rgba(255,122,69,0.12)] border border-[rgba(255,122,69,0.3)] px-[11px] py-1 rounded-full whitespace-nowrap">
            🔥 {streak}
          </span>
        )}

        {/* New result CTA */}
        <Link
          href="/log/new"
          className="flex items-center gap-1.5 bg-[var(--accent)] text-[#0A0D12] font-bold text-[13px] px-[15px] py-2 rounded-[10px] hover:brightness-110 transition-all whitespace-nowrap"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
          New result
        </Link>
      </div>
    </header>
  );
}
