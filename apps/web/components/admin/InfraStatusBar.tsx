import Link from "next/link";
import type { AdminInfraSnapshot } from "@/lib/api";
import { STATUS_COLOR } from "@/components/admin/infraStatusColors";

interface Props {
  snapshots: AdminInfraSnapshot[];
}

const SOURCE_LABEL: Record<AdminInfraSnapshot["source"], string> = {
  supabase: "DB",
  railway: "API",
  vercel: "Web",
};

// Fixed display order regardless of the order the API returns rows in.
const ORDER: AdminInfraSnapshot["source"][] = ["supabase", "railway", "vercel"];

export function InfraStatusBar({ snapshots }: Props) {
  const bySource = new Map(snapshots.map((s) => [s.source, s]));

  const announcement = ORDER.map((source) => {
    const snap = bySource.get(source);
    const status = snap?.status ?? "unknown";
    return `${SOURCE_LABEL[source]}: ${status}`;
  }).join(", ");

  return (
    <div
      className="flex items-center gap-[10px] px-[18px] py-[7px] md:gap-[12px] md:px-[28px]"
      style={{
        borderBottom: "1px solid var(--border)",
        background: "var(--surface)",
        flexShrink: 0,
        overflowX: "auto",
      }}
    >
      {/* Passive announcer for the pill states — the pills themselves are
          real navigation links, not a live region, so they stay outside this. */}
      <span
        role="status"
        aria-label="Infrastructure status"
        className="sr-only"
      >
        {announcement}
      </span>
      {ORDER.map((source) => {
        const snap = bySource.get(source);
        const status = snap?.status ?? "unknown";
        const color = STATUS_COLOR[status];
        const label = SOURCE_LABEL[source];

        return (
          <Link
            key={source}
            href="/admin/infra"
            title={`${label}: ${status} — view infrastructure detail`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              flexShrink: 0,
              padding: "3px 10px 3px 8px",
              borderRadius: 999,
              background: `color-mix(in srgb, ${color} 14%, transparent)`,
              border: `1px solid color-mix(in srgb, ${color} 38%, transparent)`,
              textDecoration: "none",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: color,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: 11.5,
                fontWeight: 600,
                color: "var(--text)",
                fontFamily: "var(--font-jetbrains-mono), monospace",
              }}
            >
              {label}
            </span>
            <span
              style={{
                fontSize: 11,
                color,
                fontFamily: "var(--font-jetbrains-mono), monospace",
              }}
            >
              {status}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
