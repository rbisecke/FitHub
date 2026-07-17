// @vitest-environment jsdom
/**
 * Tests for PlanGenerationNotice — surfaces PlanDetail.generation_tier and
 * .corrections, which existed on the API response but were never rendered
 * anywhere in the frontend (confirmed by a full grep). Verifies the notice
 * renders nothing for a normal AI-generated plan with no corrections, and
 * renders the fallback / corrections copy otherwise.
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PlanGenerationNotice } from "@/components/plans/PlanGenerationNotice";

describe("PlanGenerationNotice", () => {
  it("renders nothing for an AI-generated plan with no corrections", () => {
    const { container } = render(
      <PlanGenerationNotice generationTier="ai" corrections={[]} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when generation_tier is null and corrections are empty", () => {
    const { container } = render(
      <PlanGenerationNotice generationTier={null} corrections={[]} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders a fallback notice for deterministic_substitution", () => {
    render(
      <PlanGenerationNotice
        generationTier="deterministic_substitution"
        corrections={[]}
      />,
    );
    expect(screen.getByTestId("plan-generation-notice")).toBeDefined();
    expect(screen.getByText(/fallback method/)).toBeDefined();
  });

  it("renders a fallback notice for static_fallback", () => {
    render(
      <PlanGenerationNotice
        generationTier="static_fallback"
        corrections={[]}
      />,
    );
    expect(screen.getByTestId("plan-generation-notice")).toBeDefined();
    expect(screen.getByText(/fallback method/)).toBeDefined();
  });

  it("renders correction messages even when generation_tier is ai", () => {
    render(
      <PlanGenerationNotice
        generationTier="ai"
        corrections={["Week 1: squat sets 30 > MRV 20; scaled down"]}
      />,
    );
    expect(screen.getByTestId("plan-generation-notice")).toBeDefined();
    expect(
      screen.getByText(/squat sets 30 > MRV 20; scaled down/),
    ).toBeDefined();
    // No fallback-method copy for an "ai" tier, even with corrections present.
    expect(screen.queryByText(/fallback method/)).toBeNull();
  });

  it("renders both fallback and correction copy together", () => {
    render(
      <PlanGenerationNotice
        generationTier="static_fallback"
        corrections={["Week 2: sessions padded from 2 to 3"]}
      />,
    );
    expect(screen.getByText(/fallback method/)).toBeDefined();
    expect(screen.getByText(/sessions padded from 2 to 3/)).toBeDefined();
  });
});
