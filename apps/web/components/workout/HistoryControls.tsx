"use client";

import { useRouter, useSearchParams } from "next/navigation";

const FILTERS = ["all", "solo", "partner"] as const;
type FilterValue = (typeof FILTERS)[number];

export function HistoryControls() {
  const router = useRouter();
  const sp = useSearchParams();
  const active = (sp.get("filter") ?? "all") as FilterValue;

  return (
    <div className="flex gap-1">
      {FILTERS.map((f) => (
        <button
          key={f}
          onClick={() =>
            router.push(f === "all" ? "/history" : `/history?filter=${f}`)
          }
          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
            active === f
              ? "bg-zinc-100 text-zinc-900 border-zinc-100"
              : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
          }`}
        >
          {f}
        </button>
      ))}
    </div>
  );
}
