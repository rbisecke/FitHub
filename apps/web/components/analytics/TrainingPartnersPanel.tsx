"use client";

import Link from "next/link";
import type { TrainingPartner } from "@/lib/api";

interface Props {
  partners: TrainingPartner[];
}

export function TrainingPartnersPanel({ partners }: Props) {
  return (
    <div
      data-testid="training-partners-panel"
      className="rounded-lg border border-[--border] bg-[--surface] px-4 py-3"
    >
      <p className="text-xs font-medium text-[--muted] mb-3">
        Training Partners
      </p>
      {partners.length === 0 ? (
        <p className="text-xs text-[--muted]">
          No partners yet.{" "}
          <Link
            href="/log/new"
            className="text-[--blue] hover:underline transition-colors"
          >
            Log a partner workout
          </Link>{" "}
          to see who you train with most.
        </p>
      ) : (
        <ul className="space-y-2">
          {partners.slice(0, 3).map((p) => (
            <li
              key={p.user_id ?? p.guest_name ?? `partner-${p.display_name}`}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-[--text]">{p.display_name}</span>
              <span className="font-mono text-xs text-[--muted]">
                {p.session_count} session{p.session_count !== 1 ? "s" : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
