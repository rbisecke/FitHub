import { Siren } from "lucide-react";
import { RegionChipStrip } from "@/components/injuries/RegionChipStrip";

/**
 * Session-level referral pause panel (05 §5.1). Separate exported component
 * from `ContraindicationBadge` on purpose: this is a session-wide concern
 * (any active injury requiring referral pauses the ENTIRE session), not a
 * per-movement one. Persistent, `--red`, and would top the session screen
 * once Domain 02 exists to host it.
 */
export function ReferralPausePanel({ regions = [] }: { regions?: string[] }) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-2 rounded-[10px] px-4 py-3"
      style={{
        background: `color-mix(in srgb, var(--red) 14%, var(--bg))`,
        border: "1px solid var(--red)",
      }}
    >
      <div className="flex items-center gap-2">
        <Siren
          size={18}
          color="var(--red)"
          aria-hidden="true"
          className="shrink-0"
        />
        <p
          className="font-sans text-[14px] font-bold"
          style={{ color: "var(--red)" }}
        >
          Do not train — see a professional
        </p>
      </div>
      <p className="font-sans text-[12px]" style={{ color: "var(--text)" }}>
        One or more active injuries require professional clearance before any
        training. This pause applies to the whole session, not just flagged
        movements.
      </p>
      {regions.length > 0 && (
        <RegionChipStrip regions={regions} tone="var(--red)" />
      )}
    </div>
  );
}
