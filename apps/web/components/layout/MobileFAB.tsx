"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Plus, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

export function MobileFAB() {
  const [open, setOpen] = useState(false);
  const prefersReduced = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Auto-dismiss after 3 s of inactivity
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => setOpen(false), 3000);
    return () => clearTimeout(t);
  }, [open]);

  const transition = prefersReduced
    ? { duration: 0 }
    : { duration: 0.15, ease: "easeOut" as const };

  return (
    <div ref={containerRef}>
      {/* Speed-dial options */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={prefersReduced ? {} : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReduced ? {} : { opacity: 0, y: 8 }}
            transition={transition}
            className="z-20 flex flex-col gap-2 items-center"
            style={{
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
              bottom: "calc(env(safe-area-inset-bottom) + 108px)",
            }}
          >
            {/* $ tag option */}
            <Link
              href="/log/tag"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center w-32 h-10 rounded-lg border border-[#30363d] bg-[#161b22] font-mono text-xs text-[#8b949e] hover:border-[#58a6ff]/40 hover:text-[#e6edf3] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#58a6ff]"
            >
              $ tag
            </Link>
            {/* $ commit option (primary) */}
            <Link
              href="/log/new"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center w-32 h-10 rounded-lg bg-[#58a6ff] font-mono text-xs text-[#0d1117] hover:bg-[#58a6ff]/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#58a6ff]"
            >
              $ commit
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={open ? "Close log options" : "Log workout or milestone"}
        aria-expanded={open}
        className={[
          "z-10",
          "bg-[var(--accent)] hover:bg-[var(--accent)]/90",
          "flex items-center justify-center",
          "transition-colors",
          "focus-visible:outline-none focus-visible:ring-2",
          "focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2",
          "focus-visible:ring-offset-[var(--background)]",
        ].join(" ")}
        style={{
          position: "absolute",
          left: "50%",
          bottom: "calc(env(safe-area-inset-bottom) + 44px)",
          transform: "translateX(-50%)",
          width: 60,
          height: 60,
          borderRadius: "50%",
          border: "4px solid var(--background)",
        }}
      >
        <motion.div
          animate={open ? { rotate: 45 } : { rotate: 0 }}
          transition={transition}
        >
          {open ? (
            <X
              className="h-5 w-5 text-[var(--background)] shrink-0"
              strokeWidth={2.5}
            />
          ) : (
            <Plus
              className="h-5 w-5 text-[var(--background)] shrink-0"
              strokeWidth={2.5}
            />
          )}
        </motion.div>
      </button>
    </div>
  );
}
