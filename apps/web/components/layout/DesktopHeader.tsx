"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getPageMeta } from "./nav-config";

interface Props {
  user: User;
}

export function DesktopHeader({ user: _user }: Props) {
  const pathname = usePathname();
  const { title, gitCommand } = getPageMeta(pathname);

  return (
    <header
      className={[
        "hidden md:flex",
        "sticky top-0 z-40",
        "items-center justify-between",
        "h-14 px-6",
        "bg-[var(--bg)]",
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
        <Tooltip>
          <TooltipTrigger
            render={
              <Link
                href="/coach"
                aria-label="AI Coach"
                className={[
                  "flex h-8 w-8 items-center justify-center rounded-md",
                  "text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--secondary)]",
                  "transition-colors focus-visible:outline-none focus-visible:ring-2",
                  "focus-visible:ring-[var(--accent)]",
                ].join(" ")}
              />
            }
          >
            <MessageSquare className="h-4 w-4" />
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <span>Coach</span>
            <span className="ml-1.5 font-mono text-[10px] text-[var(--muted)]">
              $ git coach
            </span>
          </TooltipContent>
        </Tooltip>
      </div>
    </header>
  );
}
