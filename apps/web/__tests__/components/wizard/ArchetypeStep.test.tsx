// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ArchetypeStep } from "@/components/plans/wizard/ArchetypeStep";
import type { WizardState, ArchetypeSlug } from "@/lib/types/plans";

function makeState(overrides: Partial<WizardState> = {}): WizardState {
  return {
    step: 0,
    archetype: null,
    selectedPresets: new Set(),
    daysPerWeek: 4,
    targetMovementId: null,
    targetMovementName: null,
    current1rmKg: null,
    trainingAge: null,
    maxDurationWeeks: null,
    customTitle: null,
    isSubmitting: false,
    error: null,
    planId: null,
    ...overrides,
  };
}

const ALL_SLUGS: ArchetypeSlug[] = [
  "general-crossfit",
  "strength-bias",
  "travel-minimal",
  "aerobic-base",
  "bodyweight-calisthenics",
  "skill-acquisition",
  "one-rm-peak",
];

describe("ArchetypeStep", () => {
  it("renders all 7 archetype cards", () => {
    render(<ArchetypeStep state={makeState()} onSelect={vi.fn()} />);

    for (const slug of ALL_SLUGS) {
      expect(screen.getByTestId(`archetype-${slug}`)).toBeDefined();
    }

    const cards = screen.getAllByRole("radio");
    expect(cards).toHaveLength(7);
  });

  it("calls onSelect with the correct slug when a card is clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(<ArchetypeStep state={makeState()} onSelect={onSelect} />);

    await user.click(screen.getByTestId("archetype-strength-bias"));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("strength-bias");
  });

  it("marks the selected card with aria-pressed='true'", () => {
    render(
      <ArchetypeStep
        state={makeState({ archetype: "aerobic-base" })}
        onSelect={vi.fn()}
      />,
    );

    const selected = screen.getByTestId("archetype-aerobic-base");
    expect(selected.getAttribute("aria-pressed")).toBe("true");
    expect(selected.getAttribute("aria-checked")).toBe("true");
  });

  it("has no card with aria-pressed when archetype is null", () => {
    render(<ArchetypeStep state={makeState()} onSelect={vi.fn()} />);

    const pressed = screen
      .getAllByRole("radio")
      .filter((el) => el.getAttribute("aria-pressed") === "true");
    expect(pressed).toHaveLength(0);
  });

  it("calls onSelect with 'one-rm-peak' when that card is clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(<ArchetypeStep state={makeState()} onSelect={onSelect} />);

    await user.click(screen.getByTestId("archetype-one-rm-peak"));
    expect(onSelect).toHaveBeenCalledWith("one-rm-peak");
  });

  it("calls onSelect with 'skill-acquisition' when that card is clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(<ArchetypeStep state={makeState()} onSelect={onSelect} />);

    await user.click(screen.getByTestId("archetype-skill-acquisition"));
    expect(onSelect).toHaveBeenCalledWith("skill-acquisition");
  });
});
