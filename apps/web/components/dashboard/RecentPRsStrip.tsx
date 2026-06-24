"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import * as motion from "motion/react-client";
import { useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import type { PRWithDelta } from "@/lib/dashboard/prDelta";

interface RecentPRsStripProps {
  prs: PRWithDelta[];
  isNewPR?: boolean;
}

interface PRRowProps {
  pr: PRWithDelta;
  animate: boolean;
  prefersReducedMotion: boolean | null;
}

function PRRow({ pr, animate, prefersReducedMotion }: PRRowProps) {
  const shouldAnimate = animate && !prefersReducedMotion;
  return (
    <motion.div
      initial={shouldAnimate ? { scale: 0.95, opacity: 0 } : false}
      animate={shouldAnimate ? { scale: 1, opacity: 1 } : undefined}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="flex items-center justify-between rounded-lg border border-[--border] bg-[--surface] px-4 py-3 relative overflow-hidden"
    >
      {shouldAnimate && (
        <>
          {Array.from({ length: 8 }, (_, i) => {
            const angle = (i / 8) * Math.PI * 2;
            return (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full bg-[--green] pointer-events-none"
                style={{ left: "50%", top: "50%" }}
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{
                  x: Math.cos(angle) * 40,
                  y: Math.sin(angle) * 40,
                  opacity: 0,
                  scale: 0,
                }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            );
          })}
        </>
      )}
      <div>
        <p className="text-sm font-medium text-[--text]">{pr.movementName}</p>
        <p className="font-mono text-xs text-[--muted]">
          {new Date(pr.achievedAt).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
          })}
        </p>
      </div>
      <div className="text-right">
        <p className="font-mono text-sm font-semibold text-[--text]">
          {Number.isInteger(pr.bestKg) ? pr.bestKg : pr.bestKg.toFixed(1)} kg
        </p>
        {pr.deltaKg != null && pr.deltaKg > 0 && (
          <Badge
            variant="outline"
            className="text-[--green] border-[color:color-mix(in_srgb,var(--green)_40%,transparent)] text-[10px]"
          >
            +{pr.deltaKg} kg
          </Badge>
        )}
      </div>
    </motion.div>
  );
}

export function RecentPRsStrip({ prs, isNewPR = false }: RecentPRsStripProps) {
  const prefersReducedMotion = useReducedMotion();
  const router = useRouter();
  const pathname = usePathname();

  // Fire toast and strip ?pr=1 from URL after animation plays
  useEffect(() => {
    if (!isNewPR || prs.length === 0) return;

    if (!prefersReducedMotion) {
      toast.success(`New PR! ${prs[0]!.movementName} — ${prs[0]!.bestKg} kg`, {
        description:
          prs[0]!.deltaKg != null
            ? `+${prs[0]!.deltaKg} kg from your previous best`
            : "First logged lift!",
        duration: 5000,
      });
    }

    // Strip ?pr=1 so celebration doesn't replay on back/forward
    const timeout = setTimeout(() => {
      router.replace(pathname, { scroll: false });
    }, 1000);

    return () => clearTimeout(timeout);
  }, [isNewPR, prs, prefersReducedMotion, router, pathname]);

  return (
    <section aria-label="Recent personal records" className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <p className="font-mono text-xs text-[--muted]">recent PRs</p>
        {/* /records route does not exist until F8 is merged — this link will 404 until then */}
        <Link
          href="/records"
          className="font-mono text-xs text-[--accent] hover:underline"
        >
          → See all records
        </Link>
      </div>

      {prs.length === 0 ? (
        <div className="rounded-lg border border-[--border] bg-[--surface] px-4 py-3">
          <p className="text-sm text-[--muted]">No PRs logged yet.</p>
          <p className="font-mono text-xs text-[--muted] mt-1">
            Log strength work and your personal bests will appear here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {prs.map((pr, i) => (
            <PRRow
              key={`${pr.movementName}-${pr.achievedAt}`}
              pr={pr}
              animate={isNewPR && i === 0}
              prefersReducedMotion={prefersReducedMotion}
            />
          ))}
        </div>
      )}
    </section>
  );
}
