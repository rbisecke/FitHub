"use client";

import type { PRCategory } from "@/lib/records/categorise";
import { CATEGORY_LABEL, CATEGORY_ORDER } from "@/lib/records/categorise";

export type CategoryFilter = PRCategory | "all";

interface Props {
  activeCategory: CategoryFilter;
  onSelect: (cat: CategoryFilter) => void;
}

const PILLS: { value: CategoryFilter; label: string }[] = [
  { value: "all", label: "All" },
  ...CATEGORY_ORDER.map((c) => ({
    value: c as CategoryFilter,
    label: CATEGORY_LABEL[c],
  })),
];

export function CategoryTabs({ activeCategory, onSelect }: Props) {
  return (
    <div
      role="group"
      aria-label="Filter by category"
      className="flex flex-wrap gap-2"
    >
      {PILLS.map(({ value, label }) => {
        const active = value === activeCategory;
        return (
          <button
            key={value}
            aria-pressed={active}
            onClick={() => onSelect(value)}
            className={`font-data px-3 py-1.5 text-[11.5px] font-semibold rounded-full transition-colors min-h-[32px] ${
              active
                ? ""
                : "bg-[var(--card)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
            style={
              active
                ? {
                    border: "1px solid var(--accent)",
                    background: "rgba(74, 222, 128, 0.14)",
                    color: "var(--accent)",
                  }
                : undefined
            }
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
