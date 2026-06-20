"use client";

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
      <p className="font-mono text-xs text-zinc-500 mb-3">training partners</p>
      {partners.length === 0 ? (
        <p className="text-xs text-zinc-600 font-mono italic">
          No partners yet. Log a partner or team workout.
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
