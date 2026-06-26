"use client";

import Link from "next/link";
import * as motion from "motion/react-client";
import { useReducedMotion } from "motion/react";
import { buttonVariants } from "@/components/ui/button";
import { fadeUpProps } from "@/lib/motion";

interface HeroBlockProps {
  sentence: string;
  readinessLabel: string;
  isComeback?: boolean;
}

export function HeroBlock({
  sentence,
  readinessLabel,
  isComeback = false,
}: HeroBlockProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.section
      aria-label={`Training readiness summary: ${readinessLabel}`}
      className="rounded-lg border border-[--border] bg-[--surface] p-6 mb-6"
      {...fadeUpProps(prefersReducedMotion)}
    >
      <p className="font-mono text-[10px] text-[--muted] mb-2 tracking-wide uppercase">
        on-form report
      </p>
      <p className="text-lg font-medium text-[--text] leading-snug mb-5">
        {sentence}
      </p>
      <div className="flex items-center gap-4 flex-wrap">
        <Link href="/log/new" className={buttonVariants()}>
          {isComeback ? "Log your comeback workout" : "Log workout"}
        </Link>
        <span className="text-xs text-[--muted]">
          or{" "}
          <Link href="/coach" className="text-[--accent] hover:underline">
            describe your workout in words
          </Link>
        </span>
      </div>
    </motion.section>
  );
}
