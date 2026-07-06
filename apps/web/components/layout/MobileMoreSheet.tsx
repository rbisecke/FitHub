"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ADMIN_NAV_ITEM,
  MOBILE_MORE_ITEMS,
  isNavItemActive,
} from "./nav-config";

interface Props {
  open: boolean;
  onClose: () => void;
  isAdmin?: boolean;
}

function MoreItem({
  href,
  label,
  gitCommand,
  icon: Icon,
  onClose,
}: {
  href: string;
  label: string;
  gitCommand: string;
  icon: LucideIcon;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const active = isNavItemActive(pathname, href);

  return (
    <Link
      href={href}
      onClick={onClose}
      className={cn(
        "flex flex-col items-start gap-2 rounded-xl p-[13px_14px] transition-colors",
        "border font-mono text-left",
        active
          ? "border-[var(--accent)] bg-[rgba(74,222,128,0.08)] text-[var(--accent)]"
          : "border-[var(--border)] bg-[var(--surface)] text-[var(--text)]",
      )}
    >
      <Icon className="h-[17px] w-[17px] shrink-0" strokeWidth={2} />
      <span className="text-[13.5px] font-semibold leading-tight">{label}</span>
      <span className="text-[10px] text-[var(--muted)] font-normal">
        {gitCommand}
      </span>
    </Link>
  );
}

export function MobileMoreSheet({ open, onClose, isAdmin }: Props) {
  const prefersReducedMotion = useReducedMotion();
  const AdminIcon = ADMIN_NAV_ITEM.icon;

  const transition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.2, ease: "easeOut" as const };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={transition}
            onClick={onClose}
            className="fixed inset-0 z-[55] bg-[rgba(4,6,10,0.62)]"
            aria-hidden="true"
          />

          {/* Sheet */}
          <motion.div
            initial={prefersReducedMotion ? { opacity: 0 } : { y: "100%" }}
            animate={prefersReducedMotion ? { opacity: 1 } : { y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { y: "100%" }}
            transition={transition}
            className="fixed bottom-0 inset-x-0 z-[56] rounded-t-2xl border-t border-[var(--border)] bg-[var(--surface)]"
            style={{
              paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)",
            }}
            role="dialog"
            aria-label="More navigation"
          >
            <div className="px-[18px] pb-2 pt-[6px] text-[10.5px] font-mono uppercase tracking-widest text-[var(--muted)]">
              More
            </div>

            <div className="grid grid-cols-2 gap-3 px-4 pb-3">
              {MOBILE_MORE_ITEMS.map((item) => (
                <MoreItem key={item.href} {...item} onClose={onClose} />
              ))}
            </div>

            {isAdmin && (
              <div className="px-4 pt-1">
                <Link
                  href={ADMIN_NAV_ITEM.href}
                  onClick={onClose}
                  className="flex w-full items-center gap-[10px] rounded-xl border border-[rgba(255,200,61,0.35)] bg-[rgba(255,200,61,0.10)] p-[13px_14px] font-mono text-[13.5px] font-bold text-[var(--gold)] transition-colors hover:bg-[rgba(255,200,61,0.16)]"
                >
                  <AdminIcon
                    className="h-[17px] w-[17px] shrink-0"
                    strokeWidth={2}
                  />
                  <span>{ADMIN_NAV_ITEM.label}</span>
                  <span className="ml-auto text-[10px] font-normal text-[var(--muted)]">
                    {ADMIN_NAV_ITEM.gitCommand}
                  </span>
                </Link>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
