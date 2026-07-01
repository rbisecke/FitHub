"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getPageMeta } from "./nav-config";

interface Props {
  handle: string;
  streak?: number;
  branch?: string;
}

export function DesktopHeader({ handle, streak = 0, branch = "main" }: Props) {
  const pathname = usePathname();
  const { slug } = getPageMeta(pathname);
  const initial = handle.charAt(0).toUpperCase();

  return (
    <header className="hidden md:flex sticky top-0 z-40 items-center justify-between h-14 px-6 bg-[var(--background)] border-b border-[var(--border)]">
      {/* Left: breadcrumb */}
      <div className="flex items-center gap-2 font-data text-[13px]">
        <span className="text-[var(--accent)]">@{handle}</span>
        <span className="text-[var(--muted)]">/</span>
        <span className="text-[var(--foreground)] font-medium">{slug}</span>
        {/* Branch pill */}
        <span className="ml-2 text-[11px] text-[var(--muted)] bg-[var(--card)] border border-[var(--border)] px-2.5 py-0.5 rounded-full whitespace-nowrap">
          ● {branch}
        </span>
      </div>

      {/* Right: streak + CTA + avatar */}
      <div className="flex items-center gap-3">
        {streak > 0 && (
          <span className="font-data text-[12px] font-bold text-[var(--hot)] bg-[rgba(255,122,69,0.12)] border border-[rgba(255,122,69,0.3)] px-[11px] py-1 rounded-full whitespace-nowrap">
            🔥 {streak} day streak
          </span>
        )}

        <Link
          href="/log/new"
          className="flex items-center gap-1.5 bg-[var(--accent)] text-[#0A0D12] font-bold text-[13px] px-[15px] py-2 rounded-[10px] hover:brightness-110 transition-all whitespace-nowrap"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
          New result
        </Link>

        {/* User avatar */}
        <div className="w-8 h-8 rounded-full bg-[var(--blue)] flex items-center justify-center flex-shrink-0 select-none">
          <span className="font-heading text-[13px] text-[#0A0D12] font-bold">
            {initial}
          </span>
        </div>
      </div>
    </header>
  );
}
