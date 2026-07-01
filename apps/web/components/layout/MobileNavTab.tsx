"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { isNavItemActive } from "./nav-config";

interface Props {
  href: string;
  label: string;
  icon: LucideIcon;
}

export function MobileNavTab({ href, label, icon: Icon }: Props) {
  const pathname = usePathname();
  const active = isNavItemActive(pathname, href);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-0.5 pt-1",
        "text-[var(--muted)] transition-colors focus-visible:outline-none",
        "focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-sm",
        active && "text-[var(--accent)]",
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className="font-data text-[9.5px] font-semibold">{label}</span>
    </Link>
  );
}
