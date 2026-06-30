"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getPageMeta } from "./nav-config";

function initials(name: string): string {
  return name.charAt(0).toUpperCase();
}

interface Props {
  user: User;
  streak?: number;
}

export function MobileHeader({ user, streak = 0 }: Props) {
  const pathname = usePathname();
  const { title, gitCommand } = getPageMeta(pathname);
  const avatarUrl = user.user_metadata?.avatar_url as string | undefined;
  const displayEmail = user.email ?? "";

  return (
    <header
      className={[
        "md:hidden",
        "sticky top-0 z-40",
        "flex items-center justify-between",
        "h-14 px-4",
        "bg-[var(--surface)]",
      ].join(" ")}
    >
      <div>
        <p className="font-mono text-[10px] text-[var(--muted)] leading-none mb-0.5">
          {gitCommand}
        </p>
        <p className="text-sm font-semibold text-[var(--text)] leading-none">
          {title}
        </p>
      </div>

      <div className="flex items-center gap-2">
        {/* Streak badge — compact, only when streak > 0 */}
        {streak > 0 && (
          <span className="font-data text-[11px] font-bold text-[var(--hot)] bg-[rgba(255,122,69,0.12)] border border-[rgba(255,122,69,0.3)] px-2.5 py-0.5 rounded-full">
            🔥 {streak}
          </span>
        )}

        <Link
          href="/coach"
          aria-label="Open Coach chat"
          className={[
            "flex h-8 w-8 items-center justify-center rounded-md",
            "text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--secondary)]",
            "transition-colors",
          ].join(" ")}
        >
          <MessageSquare className="h-5 w-5" aria-hidden />
        </Link>

        <Link
          href="/profile"
          aria-label="Profile and settings"
          className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        >
          <Avatar className="h-7 w-7">
            <AvatarImage src={avatarUrl} alt={displayEmail} />
            <AvatarFallback className="bg-[var(--secondary)] text-[var(--text)] text-[10px] font-mono">
              {initials(displayEmail)}
            </AvatarFallback>
          </Avatar>
        </Link>
      </div>
    </header>
  );
}
