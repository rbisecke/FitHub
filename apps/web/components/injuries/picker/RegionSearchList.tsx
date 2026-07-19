"use client";

import { useMemo, useState } from "react";
import type { BodyRegion } from "./taxonomy";
import {
  ALL_BODY_REGIONS,
  FAMILY_LABEL,
  FAMILY_ORDER,
  REGION_DISPLAY_NAME,
  REGION_FAMILY,
} from "./taxonomy";

/**
 * Shared searchable, grouped region list (05 §1.1 interaction step 6).
 *
 * This is not just a convenience fallback — it is the DESIGNATED
 * screen-reader and keyboard-navigation path for the whole picker. The
 * silhouette (Variant A) is inherently spatial/visual; this plain sequence of
 * named, grouped, keyboard-operable buttons is what non-visual and
 * keyboard-only users select a region through. Both variants can render it;
 * Variant A surfaces it behind a "Search regions" link, Variant B's grid is
 * already searchable/labeled so this is optional there.
 */
export function RegionSearchList({
  selected,
  onSelect,
}: {
  selected: BodyRegion | null;
  onSelect: (region: BodyRegion) => void;
}) {
  const [query, setQuery] = useState("");

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = (r: BodyRegion) =>
      !q || REGION_DISPLAY_NAME[r].toLowerCase().includes(q) || r.includes(q);
    const all = [...ALL_BODY_REGIONS, "other" as BodyRegion];
    return FAMILY_ORDER.map((family) => ({
      family,
      regions: all.filter((r) => REGION_FAMILY[r] === family && matches(r)),
    })).filter((g) => g.regions.length > 0);
  }, [query]);

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search regions…"
        aria-label="Search body regions"
        className="mb-3 w-full rounded-[8px] px-3 py-2 font-sans text-[14px] outline-none"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          color: "var(--text)",
        }}
      />
      <div className="max-h-[50dvh] space-y-4 overflow-y-auto">
        {grouped.map((group) => (
          <div key={group.family}>
            <p
              className="mb-1.5 font-data text-[10px] uppercase tracking-wide"
              style={{ color: "var(--muted)" }}
            >
              {FAMILY_LABEL[group.family]}
            </p>
            <div className="flex flex-col gap-1">
              {group.regions.map((region) => {
                const isSelected = selected === region;
                return (
                  <button
                    key={region}
                    type="button"
                    onClick={() => onSelect(region)}
                    aria-pressed={isSelected}
                    className="flex min-h-11 w-full items-center justify-between rounded-[6px] px-3 py-2 text-left font-sans text-[14px]"
                    style={{
                      background: isSelected
                        ? "color-mix(in srgb, var(--red) 14%, var(--surface))"
                        : "var(--surface)",
                      border: `1px solid ${
                        isSelected ? "var(--red)" : "var(--border)"
                      }`,
                      color: "var(--text)",
                    }}
                  >
                    {REGION_DISPLAY_NAME[region]}
                    {isSelected && (
                      <span style={{ color: "var(--red)" }} aria-hidden="true">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {grouped.length === 0 && (
          <p
            className="font-sans text-[13px]"
            style={{ color: "var(--muted)" }}
          >
            No regions match &ldquo;{query}&rdquo;.
          </p>
        )}
      </div>
    </div>
  );
}
