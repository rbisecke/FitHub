"use client";

import type { PrerequisiteStatus } from "@/lib/types/plans";

interface Props {
  items: PrerequisiteStatus[];
}

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
        const iconColor =
          item.status === "checked"
            ? "var(--green)"
            : item.status === "target"
              ? "var(--accent)"
              : "var(--amber)";
        const icon =
          item.status === "checked"
            ? "✓"
            : item.status === "target"
              ? "◎"
              : "?";
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
              <span
                className="font-mono text-sm font-semibold"
                style={{ color: iconColor, lineHeight: "20px" }}
              >
                {icon}
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

            {/* Movement name + label */}
            <div style={{ paddingTop: "1px" }}>
              <span
                className="font-mono text-xs"
                style={{ color: "var(--text)" }}
              >
                {item.movementName}
              </span>
              {item.status !== "target" && (
                <span
                  className="font-mono text-xs"
                  style={{ color: "var(--muted)", marginLeft: "6px" }}
                >
                  prerequisite
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
