"use client";

import * as motion from "motion/react-client";
import { useReducedMotion } from "motion/react";
import type { TrainingPartner } from "@/lib/api";
import { fadeUpProps } from "@/lib/motion";

interface TrainingPartnersSummaryProps {
  partners: TrainingPartner[];
}

function partnerSummaryLine(partner: TrainingPartner): string {
  const count = partner.session_count;
  const name = partner.display_name;
  if (count > 0) {
    return `${name} logged ${count}x recently`;
  }
  return `${name} is in the repo`;
}

export function TrainingPartnersSummary({
  partners,
}: TrainingPartnersSummaryProps) {
  const prefersReducedMotion = useReducedMotion();
  const visible = partners.slice(0, 2);

  return (
    <motion.div
      className="rounded-lg border border-[--border] bg-[--surface] px-4 py-3"
      {...fadeUpProps(prefersReducedMotion, 0.12)}
    >
      <p className="font-mono text-xs text-[--muted] mb-2">training partners</p>
      <ul className="space-y-1.5">
        {visible.map((p, i) => (
          <li
            key={p.user_id ?? p.guest_name ?? i}
            className="text-xs text-[--text]"
          >
            {partnerSummaryLine(p)}
          </li>
        ))}
      </ul>
    </motion.div>
  );
}
