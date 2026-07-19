"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useReducedMotion } from "motion/react";

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
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  maxHeight?: string;
}) {
  const [visible, setVisible] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Focus management + body scroll lock for a modal dialog: move focus into the
  // panel, trap Tab inside it, restore focus and scroll on close.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusId = requestAnimationFrame(() => panelRef.current?.focus());

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])',
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
        style={{ background: "rgba(0,0,0,0.55)" }}
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
