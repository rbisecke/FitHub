"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SORT_OPTIONS, type RecordsSortOrder } from "@/lib/records/sortRecords";

const SORT_LABEL: Record<RecordsSortOrder, string> = Object.fromEntries(
  SORT_OPTIONS.map((option) => [option.value, option.label]),
) as Record<RecordsSortOrder, string>;

/**
 * Sort/filter control row (design-spec 04 Screen 1, §2). Sort resolves to a
 * `Select` dropdown, not a segmented `ToggleGroup` — an infrequent, single
 * choice from four-plus options, not primary navigation the user switches
 * between at a glance (the doc's explicit resolution of this question).
 * "Stale only" is a separate single toggle chip, not part of the dropdown.
 */
export function RecordsSortFilter({
  sortOrder,
  onSortChange,
  staleOnly,
  onStaleOnlyChange,
}: {
  sortOrder: RecordsSortOrder;
  onSortChange: (order: RecordsSortOrder) => void;
  staleOnly: boolean;
  onStaleOnlyChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Select
        value={sortOrder}
        onValueChange={(value) => onSortChange(value as RecordsSortOrder)}
      >
        <SelectTrigger
          aria-label="Sort order"
          className="h-8 border-[var(--border)] bg-[var(--surface)] font-sans text-[13px] text-[var(--text)]"
        >
          <SelectValue>
            {(value: RecordsSortOrder) => SORT_LABEL[value]}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <button
        type="button"
        aria-pressed={staleOnly}
        aria-label="Show stale movements only"
        onClick={() => onStaleOnlyChange(!staleOnly)}
        className="flex h-8 shrink-0 items-center rounded-full border px-3 font-sans text-[12px] font-medium transition-colors"
        style={{
          borderColor: staleOnly ? "var(--accent)" : "var(--border)",
          color: staleOnly ? "var(--accent)" : "var(--muted)",
          background: staleOnly
            ? "color-mix(in srgb, var(--accent) 12%, transparent)"
            : "transparent",
        }}
      >
        Stale only
      </button>
    </div>
  );
}
