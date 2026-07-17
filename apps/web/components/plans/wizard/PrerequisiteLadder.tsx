"use client";

import type { PrerequisiteStatus } from "@/lib/types/plans";

interface Props {
  items: PrerequisiteStatus[];
}

import type { PrerequisiteStatusValue } from "@/lib/types/plans";

// Status configuration keyed by PrerequisiteStatusValue.
const STATUS_CONFIG: Record<
  PrerequisiteStatusValue,
  {
    dotColor: string;
    icon: string;
    textColor: string;
    nameColor: string;
    nameBold: boolean;
  }
> = {
  checked: {
    dotColor: "var(--green)",
    icon: "✓",
    textColor: "var(--green)",
    nameColor: "var(--text)",
    nameBold: false,
  },
  pending: {
    dotColor: "transparent",
    icon: "–",
    textColor: "var(--muted)",
    nameColor: "var(--muted)",
    nameBold: false,
  },
  target: {
    dotColor: "var(--accent)",
    icon: "⚑",
    textColor: "var(--accent)",
    nameColor: "var(--accent)",
    nameBold: true,
  },
};

export function PrerequisiteLadder({ items }: Props) {
  if (items.length === 0) {
    return (
      <p className="font-mono text-xs" style={{ color: "var(--muted)" }}>
        No prerequisites
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2" aria-label="Prerequisite ladder">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const cfg = STATUS_CONFIG[item.status];
        const srLabel =
          item.status === "checked"
            ? "done"
            : item.status === "target"
              ? "goal"
              : "not yet found in logs";

        return (
          <li key={item.movementId} className="flex items-start gap-2">
            {/* Connector column */}
            <div
              className="flex flex-col items-center"
              style={{ width: "16px", minWidth: "16px" }}
              aria-hidden="true"
            >
              {/* Status dot */}
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "16px",
                  height: "20px",
                  lineHeight: "20px",
                  color: cfg.textColor,
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.8125rem",
                  fontWeight: 700,
                  border:
                    item.status === "pending"
                      ? `1px solid var(--border)`
                      : "none",
                  borderRadius: "50%",
                  background:
                    item.status === "pending"
                      ? "transparent"
                      : `color-mix(in srgb, ${cfg.dotColor} 20%, transparent)`,
                }}
              >
                {cfg.icon}
              </span>
              {!isLast && (
                <div
                  style={{
                    width: "1px",
                    flex: 1,
                    minHeight: "12px",
                    backgroundColor: "var(--border)",
                    marginTop: "2px",
                  }}
                />
              )}
            </div>

            {/* Movement name + status label */}
            <div style={{ paddingTop: "2px" }}>
              <span
                className="font-mono text-xs"
                style={{
                  color: cfg.nameColor,
                  fontWeight: cfg.nameBold ? 700 : 400,
                }}
              >
                {item.movementName}
              </span>
              {item.status !== "target" && (
                <span
                  className="font-mono text-xs"
                  style={{ color: cfg.textColor, marginLeft: "6px" }}
                >
                  {item.status === "checked" ? "done" : "prerequisite"}
                </span>
              )}
              <span className="sr-only">{srLabel}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
