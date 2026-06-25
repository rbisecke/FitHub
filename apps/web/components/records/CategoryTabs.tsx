"use client";

import type { PRCategory } from "@/lib/records/categorise";
import { CATEGORY_LABEL, CATEGORY_ORDER } from "@/lib/records/categorise";

interface Props {
  activeCategory: PRCategory;
  availableCategories: Set<PRCategory>;
  onSelect: (cat: PRCategory) => void;
}

export function CategoryTabs({
  activeCategory,
  availableCategories,
  onSelect,
}: Props) {
  return (
    <div
      role="tablist"
      aria-label="Record categories"
      className="overflow-x-auto scrollbar-none flex gap-2 border-b border-zinc-800 px-4 -mx-4"
    >
      {CATEGORY_ORDER.map((cat) => {
        const available = availableCategories.has(cat);
        const active = cat === activeCategory;
        return (
          <button
            key={cat}
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(cat)}
            className={`text-xs font-mono px-3 py-1.5 shrink-0 border-b-2 transition-colors min-h-[44px] ${
              active
                ? "text-zinc-100 border-[--accent]"
                : available
                  ? "text-zinc-500 border-transparent hover:text-zinc-300"
                  : "text-zinc-700 border-transparent cursor-default"
            }`}
          >
            {CATEGORY_LABEL[cat]}
          </button>
        );
      })}
    </div>
  );
}
