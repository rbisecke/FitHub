// @vitest-environment jsdom
/**
 * Effort 11.5 axe coverage gap-fill: AssistantMessage (Domain 03, Effort 7 —
 * Coach AI Chat) is the highest-traffic render in the coach domain (every
 * assistant turn, in all three streaming-lifecycle phases) and had zero
 * automated a11y coverage. The full ChatThread orchestrator is covered by the
 * manual keyboard + live-region pass instead (09 §8) since it needs the
 * useChatStream hook and consent/localStorage mocking; this component is the
 * self-contained rendering unit worth locking in per-phase.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { axe } from "vitest-axe";
import { AssistantMessage } from "@/components/coach/AssistantMessage";

// Settled turns render CitationsRow, which calls useIsMobile() (hooks/use-mobile.ts)
// — jsdom has no matchMedia implementation, so stub it (same pattern as
// freeze-reveal.test.tsx / use-reduced-motion.test.tsx).
beforeEach(() => {
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
    media: "",
    addEventListener: () => {},
    removeEventListener: () => {},
  }) as unknown as typeof window.matchMedia;
});

describe("AssistantMessage a11y", () => {
  it("has no axe violations while thinking", async () => {
    const { container } = render(<AssistantMessage phase="thinking" text="" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has no axe violations while streaming", async () => {
    const { container } = render(
      <AssistantMessage phase="streaming" text="Building your session…" />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has no axe violations when settled, with citations and follow-up chips", async () => {
    const { container } = render(
      <AssistantMessage
        phase="settled"
        text="Here's today's session, adjusted for your reported knee soreness."
        safetyTier="modify"
        stub
        citations={[
          {
            title: "ACWR ramp-rate guidance",
            source_type: "sports_science",
            score: 0.92,
          },
        ]}
        followUpChips={[{ id: "show-swap", label: "Show the swap" }]}
        onSelectChip={() => {}}
      />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
