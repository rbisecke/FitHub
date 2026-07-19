import { RegionGlyph } from "@/components/injuries/RegionGlyph";
import type { BodyRegion } from "@/lib/api/plans";

/** Special-case labels for regions whose Title Case form reads wrong (acronyms). */
const REGION_LABEL_OVERRIDES: Partial<Record<string, string>> = {
  it_band: "IT Band",
  si_joint: "SI Joint",
};

export function regionLabel(region: string): string {
  return (
    REGION_LABEL_OVERRIDES[region] ??
    region.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

/**
 * Reusable named-region chip strip (05 §1.1, §4, §5.1 — plan step 4.22). Used
 * for `driven_by` displays: the injury detail header, the multi-injury
 * banner, and the contraindication reveal sheet.
 */
export function RegionChipStrip({
  regions,
  tone = "var(--text)",
}: {
  regions: string[];
  tone?: string;
}) {
  if (regions.length === 0) return null;
  return (
    <div
      className="flex flex-wrap gap-1.5"
      role="list"
      aria-label="Body regions"
    >
      {regions.map((region) => (
        <span
          key={region}
          role="listitem"
          className="inline-flex items-center gap-1 rounded-full px-2 py-1 font-sans text-[12px]"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            color: "var(--text)",
          }}
        >
          <RegionGlyph region={region as BodyRegion} size={14} tone={tone} />
          {regionLabel(region)}
        </span>
      ))}
    </div>
  );
}
