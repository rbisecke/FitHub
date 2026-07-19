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
import { RegionIcon } from "./RegionIcon";
import type { AlreadyLoggedRegion } from "./VariantASilhouettePicker";

export interface VariantBPickerProps {
  selected: BodyRegion | null;
  onSelectedChange: (region: BodyRegion | null) => void;
  severity?: "amber" | "red";
  alreadyLoggedRegions?: AlreadyLoggedRegion[];
}

const ALL_WITH_OTHER: BodyRegion[] = [...ALL_BODY_REGIONS, "other"];

/**
 * Variant B — grid of mini-diagram cards, one per region (05 §1.1
 * "SimpleTherapy grid"). One tap selects directly; no drill-down. `other` is
 * visually deprioritized (muted, last, no severity fill) since it has no
 * curated contraindication/substitution data behind it.
 */
export function VariantBGridPicker({
  selected,
  onSelectedChange,
  severity = "red",
  alreadyLoggedRegions = [],
}: VariantBPickerProps) {
  const [query, setQuery] = useState("");
  const glowColor = severity === "red" ? "var(--red)" : "var(--amber)";
  const alreadyLoggedMap = useMemo(
    () => new Map(alreadyLoggedRegions.map((r) => [r.region, r.count])),
    [alreadyLoggedRegions],
  );

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = (r: BodyRegion) =>
      !q || REGION_DISPLAY_NAME[r].toLowerCase().includes(q);
    return FAMILY_ORDER.map((family) => ({
      family,
      regions: ALL_WITH_OTHER.filter(
        (r) => REGION_FAMILY[r] === family && matches(r),
      ),
    })).filter((g) => g.regions.length > 0);
  }, [query]);

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search regions…"
        aria-label="Filter region grid"
        className="sticky top-0 z-10 mb-3 w-full rounded-[8px] px-3 py-2 font-sans text-[14px] outline-none"
        style={{
          background: "var(--bg)",
          border: "1px solid var(--border)",
          color: "var(--text)",
        }}
      />

      {selected && (
        <div
          aria-live="polite"
          className="sticky top-[52px] z-10 mb-3 rounded-[8px] px-3 py-2 font-sans text-[13px] font-medium"
          style={{
            background: `color-mix(in srgb, ${glowColor} 12%, var(--bg))`,
            color: "var(--text)",
          }}
        >
          Selected: {REGION_DISPLAY_NAME[selected]}
        </div>
      )}

      <div className="space-y-5">
        {grouped.map((group) => (
          <section key={group.family}>
            <p
              className="mb-2 font-data text-[10px] uppercase tracking-wide"
              style={{ color: "var(--muted)" }}
            >
              {FAMILY_LABEL[group.family]}
            </p>
            <div className="grid grid-cols-3 gap-2 md:grid-cols-5 lg:grid-cols-6">
              {group.regions.map((region) => {
                const isSelected = selected === region;
                const isOther = region === "other";
                const count = alreadyLoggedMap.get(region);
                return (
                  <button
                    key={region}
                    type="button"
                    onClick={() => onSelectedChange(isSelected ? null : region)}
                    aria-pressed={isSelected}
                    aria-label={
                      count
                        ? `${REGION_DISPLAY_NAME[region]} — already logged (${count})`
                        : REGION_DISPLAY_NAME[region]
                    }
                    className="flex min-h-11 flex-col items-center gap-1 rounded-[10px] px-2 py-3 text-center"
                    style={{
                      background:
                        isSelected && !isOther
                          ? glowColor
                          : isOther
                            ? "color-mix(in srgb, var(--border) 40%, var(--bg))"
                            : "var(--surface)",
                      border: `1px solid ${
                        isSelected && !isOther ? glowColor : "var(--border)"
                      }`,
                      opacity: isOther && !isSelected ? 0.7 : 1,
                    }}
                  >
                    <div className="relative">
                      <RegionIcon
                        region={region}
                        color={
                          isSelected && !isOther ? "var(--bg)" : "var(--muted)"
                        }
                      />
                      {isSelected && (
                        <span
                          aria-hidden="true"
                          className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full font-data text-[10px]"
                          style={{
                            background: "var(--bg)",
                            color: isOther ? "var(--text)" : glowColor,
                          }}
                        >
                          ✓
                        </span>
                      )}
                    </div>
                    <span
                      className="font-sans text-[11px] leading-tight"
                      style={{
                        color:
                          isSelected && !isOther ? "var(--bg)" : "var(--text)",
                      }}
                    >
                      {REGION_DISPLAY_NAME[region]}
                    </span>
                    {count ? (
                      <span
                        className="font-mono text-[9px] tabular-nums"
                        style={{
                          color:
                            isSelected && !isOther
                              ? "var(--bg)"
                              : "var(--muted)",
                        }}
                      >
                        logged ×{count}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </section>
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
