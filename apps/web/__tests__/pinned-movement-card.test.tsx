// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PinnedMovementCard } from "@/components/profile/PinnedMovementCard";
import type { PinnedMovement } from "@/lib/api";

function make(overrides: Partial<PinnedMovement> = {}): PinnedMovement {
  return {
    movement_id: "abc-123",
    movement_name: "Back Squat",
    modality: "strength",
    display_order: 0,
    personal_record: null,
    ...overrides,
  };
}

describe("PinnedMovementCard", () => {
  it("renders the movement name", () => {
    render(<PinnedMovementCard movement={make()} />);
    expect(screen.getByText("Back Squat")).toBeTruthy();
  });

  it("shows the PR value in kg when personal_record has load_kg", () => {
    render(
      <PinnedMovementCard
        movement={make({ personal_record: { load_kg: 140 } })}
      />,
    );
    expect(screen.getByText("140 kg")).toBeTruthy();
  });

  it("shows — when personal_record is null", () => {
    render(<PinnedMovementCard movement={make({ personal_record: null })} />);
    expect(screen.getByText("—")).toBeTruthy();
  });

  it("formats time_s as mm:ss", () => {
    render(
      <PinnedMovementCard
        movement={make({
          movement_name: "2km Row",
          modality: "mono_structural",
          personal_record: { time_s: 432 }, // 7 min 12 sec
        })}
      />,
    );
    expect(screen.getByText("07:12")).toBeTruthy();
  });

  it("formats a time at an exact minute boundary", () => {
    render(
      <PinnedMovementCard
        movement={make({
          personal_record: { time_s: 1200 }, // 20:00
        })}
      />,
    );
    expect(screen.getByText("20:00")).toBeTruthy();
  });

  it("shows the modality chip", () => {
    render(<PinnedMovementCard movement={make({ modality: "gymnastics" })} />);
    expect(screen.getByText("gymnastics")).toBeTruthy();
  });
});
