"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { BodyRegion } from "./taxonomy";
import {
  DETAILED_TO_STANDARD_PARENT,
  REGION_DISPLAY_NAME,
  STANDARD_TO_DETAILED,
  isGroupingKey,
} from "./taxonomy";
import type { Side } from "./geometry";
import {
  REGION_SIDE,
  groupingShapesForSide,
  insetClusterFor,
  standardShapesForSide,
} from "./geometry";
import { BodySilhouette } from "./BodySilhouette";
import { TapTargetInset } from "./TapTargetInset";
import { RegionSearchList } from "./RegionSearchList";
import { Skeleton } from "@/components/ui/skeleton";

type Tier = "standard" | "detailed";
export type AlreadyLoggedRegion = { region: BodyRegion; count: number };

export interface VariantAPickerProps {
  selected: BodyRegion | null;
  onSelectedChange: (region: BodyRegion | null) => void;
  severity?: "amber" | "red";
  /** Regions with an unresolved injury already logged — informational only. */
  alreadyLoggedRegions?: AlreadyLoggedRegion[];
  /** Quiet, non-blocking notice if the already-logged fetch failed. */
  alreadyLoggedError?: boolean;
}

function standardGlowTarget(
  selected: BodyRegion | null,
  tier: Tier,
  side: Side,
): BodyRegion | null {
  if (!selected || tier === "detailed") return selected;
  const standardIds = new Set(standardShapesForSide(side).map((s) => s.id));
  if (standardIds.has(selected)) return selected;
  const parent = DETAILED_TO_STANDARD_PARENT[selected];
  // Grouping keys (upper_arm_group, foot_lower_leg_group) have no real
  // BodyRegion shape to glow in Standard tier — the chip still shows the
  // real selection, the silhouette just doesn't highlight anything for it.
  if (parent && !isGroupingKey(parent) && standardIds.has(parent)) {
    return parent;
  }
  return null;
}

/**
 * Variant A — the two-tier silhouette picker (05 §1.1). Front/Back toggle is
 * mobile-only; desktop (≥768px) renders both views side by side instead.
 */
export function VariantASilhouettePicker({
  selected,
  onSelectedChange,
  severity = "red",
  alreadyLoggedRegions = [],
  alreadyLoggedError = false,
}: VariantAPickerProps) {
  const prefersReducedMotion = useReducedMotion() ?? false;
  // Region `<path id>`s are literal enum values (05 §1.1 asset spec), so
  // front+back must never both be mounted at once — CSS-hiding one via
  // `md:hidden` while still rendering it would duplicate every id in the DOM.
  // Conditionally mounting only the active layout keeps ids unique.
  const isMobile = useIsMobile(768);
  // useIsMobile always reports `false` on the very first client render (to
  // match the SSR snapshot and avoid a hydration mismatch), correcting to the
  // real value a moment later — without gating on mount, that first render
  // briefly shows the desktop side-by-side layout even on a real mobile
  // viewport, with sub-44px tap targets, until the correction lands.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // Deferred into a microtask so no setState runs synchronously during the
    // effect body (react-hooks/set-state-in-effect).
    Promise.resolve().then(() => setMounted(true));
  }, []);
  const [side, setSide] = useState<Side>("front");
  const [tier, setTier] = useState<Tier>("standard");
  const [pulsingRegions, setPulsingRegions] = useState<BodyRegion[]>([]);
  const [insetRegion, setInsetRegion] = useState<BodyRegion | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  // Explicitly `number` (not `ReturnType<typeof window.setTimeout>`) — with
  // @types/node in scope, that resolves to Node's Timeout type even though
  // `window.setTimeout` always returns a number in the browser.
  const pulseTimeoutRef = useRef<number | null>(null);

  // A second grouping tap before the first pulse finishes must not let the
  // first timer clear pulsingRegions out from under the new one — always
  // cancel any pending timer before scheduling the next, and on unmount.
  useEffect(() => {
    return () => {
      if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current);
    };
  }, []);

  function handleTapGrouping(groupingId: string) {
    const shape = groupingShapesForSide(side).find((g) => g.id === groupingId);
    if (!shape) return;
    const toPulse = STANDARD_TO_DETAILED[shape.key].filter(
      (r) => REGION_SIDE[r] === side,
    );
    setTier("detailed");
    setPulsingRegions(toPulse);
    if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current);
    pulseTimeoutRef.current = window.setTimeout(
      () => setPulsingRegions([]),
      prefersReducedMotion ? 1600 : 500,
    );
  }

  function commitSelection(region: BodyRegion) {
    onSelectedChange(region);
    setInsetRegion(null);
    setShowSearch(false);
  }

  const alreadyLoggedMap = new Map(
    alreadyLoggedRegions.map((r) => [r.region, r.count]),
  );
  const selectedAlreadyLoggedCount = selected
    ? alreadyLoggedMap.get(selected)
    : undefined;
  const activeInsetCluster = insetRegion
    ? insetClusterFor(side, insetRegion)
    : undefined;

  function renderSilhouette(viewSide: Side) {
    const cluster = viewSide === side ? activeInsetCluster : undefined;
    return (
      <div key={viewSide} className="relative flex flex-col items-center">
        <BodySilhouette
          side={viewSide}
          tier={tier}
          selected={standardGlowTarget(selected, tier, viewSide)}
          severity={severity}
          alreadyLoggedRegions={alreadyLoggedRegions.map((r) => r.region)}
          pulsingRegions={viewSide === side ? pulsingRegions : []}
          prefersReducedMotion={prefersReducedMotion}
          onSelectRegion={commitSelection}
          onTapGrouping={(id) => {
            setSide(viewSide);
            handleTapGrouping(id);
          }}
          onRequestInset={(region) => {
            setSide(viewSide);
            setInsetRegion(region);
          }}
        />
        {cluster && (
          <TapTargetInset
            cluster={cluster}
            onSelect={commitSelection}
            onClose={() => setInsetRegion(null)}
          />
        )}
        <p
          className="mt-1 font-data text-[10px] uppercase tracking-wide"
          style={{ color: "var(--muted)" }}
        >
          {viewSide}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        {mounted && isMobile && (
          <ToggleGroup
            value={[side]}
            onValueChange={(vals) => {
              const next = vals[0];
              if (next === "front" || next === "back") setSide(next);
            }}
            aria-label="Front or back view"
          >
            {(["front", "back"] as const).map((v) => (
              <ToggleGroupItem
                key={v}
                value={v}
                aria-label={v === "front" ? "Front view" : "Back view"}
                className="min-h-11 rounded-[8px] px-3 font-sans text-[13px]"
                style={{
                  background: side === v ? "var(--accent)" : "var(--bg)",
                  color: side === v ? "var(--bg)" : "var(--text)",
                  border: `1px solid ${
                    side === v ? "var(--accent)" : "var(--border)"
                  }`,
                }}
              >
                {v === "front" ? "Front" : "Back"}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        )}
        <ToggleGroup
          value={[tier]}
          onValueChange={(vals) => {
            const next = vals[0];
            if (next === "standard" || next === "detailed") setTier(next);
          }}
          aria-label="Standard or detailed region tier"
        >
          {(["standard", "detailed"] as const).map((v) => (
            <ToggleGroupItem
              key={v}
              value={v}
              aria-label={v === "standard" ? "Standard tier" : "Detailed tier"}
              className="min-h-11 rounded-[8px] px-3 font-sans text-[13px]"
              style={{
                background: tier === v ? "var(--accent)" : "var(--bg)",
                color: tier === v ? "var(--bg)" : "var(--text)",
                border: `1px solid ${
                  tier === v ? "var(--accent)" : "var(--border)"
                }`,
              }}
            >
              {v === "standard" ? "Standard" : "Detailed"}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {pulsingRegions.length > 0 && (
        <p
          className="mb-2 text-center font-sans text-[13px] font-medium"
          style={{ color: "var(--accent)" }}
        >
          Which part?
        </p>
      )}

      <div
        // Remounting on tier/side change restarts the CSS cross-fade below —
        // 200ms per 05 §1.1 interaction step 5 — with no JS animation state.
        key={`${side}-${tier}`}
        className={`flex flex-col items-center gap-6 md:flex-row md:items-start md:justify-center ${
          prefersReducedMotion ? "" : "picker-crossfade"
        }`}
      >
        {/* Mobile: only the active side. Desktop: both, side by side. Only
            one layout is ever mounted — see the isMobile comment above. Until
            `mounted`, the real viewport isn't known yet — show a skeleton
            instead of guessing, so we never paint the wrong layout. */}
        {!mounted ? (
          <Skeleton className="aspect-[2/5] w-full max-w-[280px]" />
        ) : isMobile ? (
          renderSilhouette(side)
        ) : (
          <div className="flex gap-10">
            {renderSilhouette("front")}
            {renderSilhouette("back")}
          </div>
        )}
      </div>
      <style>{`
        @keyframes picker-crossfade-kf {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .picker-crossfade {
          animation: picker-crossfade-kf 200ms ease;
        }
      `}</style>

      <div className="mt-4 flex min-h-8 items-center justify-center">
        {selected ? (
          <div
            className="flex items-center gap-1 rounded-full py-1 pl-3 pr-1"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
            }}
          >
            <span
              className="font-sans text-[13px]"
              style={{ color: "var(--text)" }}
            >
              {REGION_DISPLAY_NAME[selected]} —{" "}
              {side === "front" ? "Front" : "Back"}
            </span>
            <button
              type="button"
              onClick={() => onSelectedChange(null)}
              aria-label="Clear selected region"
              className="flex min-h-11 min-w-11 items-center justify-center"
              style={{ color: "var(--muted)" }}
            >
              ✕
            </button>
          </div>
        ) : (
          <p
            className="font-sans text-[13px]"
            style={{ color: "var(--muted)" }}
          >
            Tap a region to select it.
          </p>
        )}
      </div>

      {selected && selectedAlreadyLoggedCount ? (
        <div className="mt-1 flex justify-center">
          <Link
            href="/injuries"
            className="font-sans text-[12px] underline"
            style={{ color: "var(--accent)" }}
          >
            View existing ({selectedAlreadyLoggedCount}) →
          </Link>
        </div>
      ) : null}

      {alreadyLoggedError && (
        <p
          className="mt-2 text-center font-sans text-[12px]"
          style={{ color: "var(--muted)" }}
        >
          Couldn&apos;t load prior injuries for context — new reports still
          work.
        </p>
      )}

      <div className="mt-3 flex justify-center">
        <button
          type="button"
          onClick={() => setShowSearch((v) => !v)}
          className="font-sans text-[13px] underline"
          style={{ color: "var(--accent)" }}
        >
          Can&apos;t find it? Search regions →
        </button>
      </div>

      {showSearch && (
        <div
          className="mt-3 rounded-[10px] p-3"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
          }}
        >
          <RegionSearchList selected={selected} onSelect={commitSelection} />
        </div>
      )}
    </div>
  );
}
