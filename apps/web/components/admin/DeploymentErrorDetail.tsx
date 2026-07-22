"use client";

import { useState } from "react";

/**
 * Expandable `DeploymentEvent.error_message` for a failed deploy row (08 §8
 * States: "Deploy failure ... its `error_message` is expandable"). Split into
 * its own client component so the surrounding `DeploymentList` / `InfraPanel`
 * tree can stay a Server Component — this button is the only piece of the
 * infra page that needs interactive state.
 */
export function DeploymentErrorDetail({ message }: { message: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{ paddingLeft: 14 }}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-label={
          expanded
            ? "Collapse deploy error details"
            : "Expand deploy error details"
        }
        style={{
          // A pill background (not just red text on a red-tinted row) —
          // this is the key debugging affordance on a failed-deploy row and
          // was too low-contrast against the maroon fill (UI critique
          // 2026-07-22).
          background: "color-mix(in srgb, var(--red) 22%, transparent)",
          border: "1px solid color-mix(in srgb, var(--red) 50%, transparent)",
          borderRadius: 6,
          padding: "3px 8px",
          color: "var(--red)",
          fontFamily: "var(--font-jetbrains-mono), monospace",
          fontSize: 12,
          fontWeight: 700,
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        {expanded ? "Hide error details ▲" : "Show error details ▼"}
      </button>
      {expanded && (
        <div
          style={{
            marginTop: 4,
            color: "var(--red)",
            fontSize: 11.5,
            whiteSpace: "pre-wrap",
            overflowWrap: "anywhere",
          }}
        >
          {message}
        </div>
      )}
    </div>
  );
}
