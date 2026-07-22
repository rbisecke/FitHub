// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FreezeReveal } from "@/components/gamification/FreezeReveal";

// `motion/react`'s useReducedMotion reads `window.matchMedia` — forcing it to
// "reduce" collapses FreezeReveal to its static, already-resolved state so
// these tests don't depend on the beat timers.
function mockReducedMotion() {
  window.matchMedia = vi.fn().mockReturnValue({
    matches: true,
    media: "(prefers-reduced-motion: reduce)",
    addEventListener: () => {},
    removeEventListener: () => {},
  }) as unknown as typeof window.matchMedia;
}

afterEach(() => {
  vi.restoreAllMocks();
  document.body.style.overflow = "";
});

describe("FreezeReveal", () => {
  it("locks body scroll while mounted and restores it on unmount", () => {
    mockReducedMotion();
    const prevOverflow = document.body.style.overflow;
    const { unmount } = render(
      <FreezeReveal
        currentStreak={4}
        freezesRemaining={1}
        coveredWeekKey="2026-07-06"
        onDismiss={() => {}}
      />,
    );
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).toBe(prevOverflow);
  });

  it("calls onDismiss when Escape is pressed", () => {
    mockReducedMotion();
    const onDismiss = vi.fn();
    render(
      <FreezeReveal
        currentStreak={4}
        freezesRemaining={1}
        coveredWeekKey="2026-07-06"
        onDismiss={onDismiss}
      />,
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("calls onDismiss when the Got it button is clicked", () => {
    mockReducedMotion();
    const onDismiss = vi.fn();
    render(
      <FreezeReveal
        currentStreak={4}
        freezesRemaining={1}
        coveredWeekKey="2026-07-06"
        onDismiss={onDismiss}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /got it/i }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
