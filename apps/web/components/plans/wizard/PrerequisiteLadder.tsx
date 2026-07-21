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
    // Fully-saturated purple — the one sanctioned non-coach use of purple in
    // this domain (design spec §1.2, §10): a deliberately shared
    // "achievement marker" meaning with Domain 04's PR moments, not a
    // collision with the AI-coach identity (which is teal/cyan).
    dotColor: "var(--purple)",
    icon: "⚑",
    textColor: "var(--purple)",
    nameColor: "var(--purple)",
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

        // The "you are here" rung gets a full-row highlight (not just
        // trailing text) so it's scannable without reading every line —
        // and a distinct filled-dot icon when it's still a pending rung
        // (the common case; the target rung keeps its flag icon even when
        // it's also the current entry point, in the all-confirmed state).
        const dotIcon =
          item.isCurrent && item.status === "pending" ? "●" : cfg.icon;

        return (
          <li
            key={item.movementId}
            className="flex items-start gap-2 rounded-md"
            style={{
              background: item.isCurrent
                ? "color-mix(in srgb, var(--amber) 12%, transparent)"
                : "transparent",
              borderLeft: item.isCurrent
                ? "2px solid var(--amber)"
                : "2px solid transparent",
              padding: "4px 8px 4px 6px",
              marginLeft: "-6px",
            }}
          >
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
                  color:
                    item.isCurrent && item.status === "pending"
                      ? "var(--amber)"
                      : cfg.textColor,
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.8125rem",
                  fontWeight: 700,
                  border:
                    item.status === "pending" && !item.isCurrent
                      ? `1px solid var(--border)`
                      : "none",
                  borderRadius: "50%",
                  background:
                    item.status === "pending" && !item.isCurrent
                      ? "transparent"
                      : `color-mix(in srgb, ${
                          item.isCurrent && item.status === "pending"
                            ? "var(--amber)"
                            : cfg.dotColor
                        } 20%, transparent)`,
                }}
              >
                {dotIcon}
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
                  fontWeight: cfg.nameBold || item.isCurrent ? 700 : 400,
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
              {item.isCurrent && (
                <span
                  className="font-mono text-xs font-semibold"
                  style={{ color: "var(--amber)", marginLeft: "6px" }}
                >
                  ← you are here
                </span>
              )}
              <span className="sr-only">
                {srLabel}
                {item.isCurrent ? ", you are here" : ""}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
