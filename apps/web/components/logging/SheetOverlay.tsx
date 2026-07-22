"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useReducedMotion } from "motion/react";

// Module-level stack of currently-mounted `SheetOverlay` instances, keyed by
// a monotonic id. When one `SheetOverlay` is nested inside another (e.g. an
// "add participant" picker opened from within an already-open form sheet),
// each instance adds its own `window` Escape-key listener — without this,
// a single Escape press fires BOTH listeners in the same event dispatch
// (registration order), closing the nested sheet AND the sheet underneath
// it, silently discarding whatever the outer sheet held. Only the topmost
// (most-recently-mounted) instance's Escape handler is allowed to act.
let sheetOverlayIdSeq = 0;
const openSheetOverlayIds: number[] = [];

/**
 * Inline bottom-sheet overlay for the Log domain (01 § component mapping).
 *
 * Deliberately NOT the shadcn Sheet primitive: that portals to document.body,
 * which escapes the page's `data-theme="light"` wrapper and would render the
 * sheet in the app's dark theme. Rendered inline as a DOM descendant of the
 * forced-light subtree, this overlay inherits the light tokens through normal
 * CSS custom-property cascade (position:fixed does not break inheritance).
 *
 * Mobile (<768px): bottom sheet, swipe/tap-out to dismiss. Desktop (≥768px):
 * the same surface centered as a dialog (§ mapping resolves modal sheets to a
 * centered Dialog at desktop width).
 */
export function SheetOverlay({
  title,
  onClose,
  children,
  maxHeight = "82dvh",
  backdropOpacity = 0.55,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  maxHeight?: string;
  /** Backdrop darkness, 0-1. Lower this for a sheet nested on top of another
   * open `SheetOverlay` — two full-opacity scrims stacked read as "double
   * dimming" (the base sheet looks disabled rather than simply behind). */
  backdropOpacity?: number;
}) {
  const [visible, setVisible] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const instanceIdRef = useRef<number | null>(null);
  if (instanceIdRef.current == null)
    instanceIdRef.current = ++sheetOverlayIdSeq;

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Focus management + body scroll lock for a modal dialog: move focus into the
  // panel, trap Tab inside it, restore focus and scroll on close.
  useEffect(() => {
    const instanceId = instanceIdRef.current!;
    openSheetOverlayIds.push(instanceId);

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusId = requestAnimationFrame(() => panelRef.current?.focus());

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        const topmost = openSheetOverlayIds[openSheetOverlayIds.length - 1];
        if (topmost !== instanceId) return; // a nested sheet owns Escape right now
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      // `:disabled`/`aria-disabled` elements match these selectors but are never
      // real Tab stops (the browser skips them), so leaving them in breaks the
      // wrap-around exactly when the true last reachable control precedes a
      // disabled trailing button (e.g. a submit button gated on validation) —
      // found live on the injury report sheet's disabled "Report injury"
      // button during the 09 §8 audit (09.11.5).
      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter(
        (el) =>
          !(el as HTMLButtonElement).disabled &&
          el.getAttribute("aria-disabled") !== "true",
      );
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
    return () => {
      const i = openSheetOverlayIds.indexOf(instanceId);
      if (i !== -1) openSheetOverlayIds.splice(i, 1);
      window.removeEventListener("keydown", onKey);
      cancelAnimationFrame(focusId);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center md:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        className="absolute inset-0 cursor-default"
        style={{ background: `rgba(0,0,0,${backdropOpacity})` }}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className="relative w-full rounded-t-[16px] outline-none md:mx-4 md:w-[520px] md:rounded-[16px]"
        style={{
          background: "var(--bg)",
          border: "1px solid var(--border)",
          maxHeight,
          transform: visible ? "translateY(0)" : "translateY(6%)",
          opacity: visible ? 1 : 0,
          transition: prefersReducedMotion
            ? "none"
            : "transform 200ms cubic-bezier(0.2,0,0,1), opacity 200ms",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <div className="flex justify-center pt-3 md:hidden">
          <div
            className="h-1 w-9 rounded-full"
            style={{ background: "var(--border)" }}
          />
        </div>
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <span
            className="font-sans text-[15px] font-semibold"
            style={{ color: "var(--text)" }}
          >
            {title}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-11 w-11 items-center justify-center font-data text-[18px]"
            style={{ color: "var(--muted)" }}
          >
            ×
          </button>
        </div>
        <div
          className="overflow-y-auto px-5 py-4"
          style={{ maxHeight: "70dvh" }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
