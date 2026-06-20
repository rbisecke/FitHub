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
      className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3"
    >
      <p className="text-xs font-medium text-zinc-400 mb-3">
        Training Partners
      </p>
      {partners.length === 0 ? (
        <p className="text-xs text-zinc-500">
          No partners yet.{" "}
          <Link
            href="/log/new"
            className="text-cyan-500 hover:text-cyan-400 transition-colors"
          >
            Log a partner workout
          </Link>{" "}
          to see who you train with most.
        </p>
      ) : (
        <ul className="space-y-2">
          {partners.slice(0, 3).map((p) => (
            <li
              key={p.user_id ?? p.guest_name}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-zinc-300">{p.display_name}</span>
              <span className="font-mono text-xs text-zinc-500">
                {p.session_count} session{p.session_count !== 1 ? "s" : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
