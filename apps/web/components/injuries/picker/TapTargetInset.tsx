"use client";

import { useEffect, useRef } from "react";
import type { BodyRegion } from "./taxonomy";
import { REGION_DISPLAY_NAME } from "./taxonomy";
import type { InsetCluster } from "./geometry";

/**
 * Magnified tap-target-disambiguation inset (05 §1.1, required). Several
 * Detailed-tier regions render below 44×44px at a 375px viewport (rotator
 * cuff vs shoulder; the two elbow epicondyles). Rather than trying to make
 * individual SVG paths pixel-precise to hit 44px, the first tap on any
 * region in a known small/adjacent cluster opens this inline popover with
 * one full-size (min 44px) button per region in the cluster, and the actual
 * selection commit happens here.
 *
 * Rendered inline (not a portalled Popover/Dialog) so it stays inside the
 * `ForcedTheme theme="light"` subtree — same reasoning as
 * components/logging/SheetOverlay.tsx.
 */
export function TapTargetInset({
  cluster,
  onSelect,
  onClose,
}: {
  cluster: InsetCluster;
  onSelect: (region: BodyRegion) => void;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      // Trap Tab focus inside the panel — this is a modal popover over the
      // silhouette, so Tab must not leak focus to the obscured background.
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusable =
        panelRef.current.querySelectorAll<HTMLElement>("button");
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    const id = requestAnimationFrame(() => {
      panelRef.current?.querySelector("button")?.focus();
    });
    return () => {
      window.removeEventListener("keydown", onKey);
      cancelAnimationFrame(id);
    };
  }, [onClose]);

  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center rounded-[10px]"
      style={{ background: "color-mix(in srgb, var(--bg) 65%, transparent)" }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Select the precise region"
        className="w-[88%] max-w-[280px] rounded-[12px] p-4 shadow-lg"
        style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
      >
        <p
          className="mb-3 font-sans text-[13px] font-semibold"
          style={{ color: "var(--text)" }}
        >
          Which part exactly?
        </p>
        <div className="flex flex-col gap-2">
          {cluster.regions.map((region) => (
            <button
              key={region}
              type="button"
              onClick={() => onSelect(region)}
              className="min-h-11 w-full rounded-[8px] px-3 py-2 text-left font-sans text-[14px]"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            >
              {REGION_DISPLAY_NAME[region]}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-3 min-h-11 w-full rounded-[8px] font-sans text-[13px]"
          style={{ color: "var(--muted)" }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
