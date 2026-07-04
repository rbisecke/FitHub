// @vitest-environment jsdom
/**
 * Tests for the NL input toggle on /log/new.
 * Verifies the "or describe your workout" toggle renders and the Parse with AI
 * button appears after the textarea is visible.
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

// --- module stubs ---
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/lib/api/client", () => ({
  api: {
    coach: { parseLog: vi.fn() },
    workouts: { create: vi.fn(), get: vi.fn() },
  },
}));

vi.mock("@/lib/toast", () => ({ toasts: { workoutLogged: vi.fn() } }));
vi.mock("@/lib/pr-celebrations", () => ({ fireInitialCommitToast: vi.fn() }));

vi.mock("@/components/log/MovementGrid", () => ({
  MovementGrid: () => <div data-testid="movement-grid" />,
}));
vi.mock("@/components/log/MovementSearchDialog", () => ({
  MovementSearchDialog: () => null,
}));
vi.mock("@/components/log/AddDetailsCollapsible", () => ({
  AddDetailsCollapsible: () => null,
}));
vi.mock("@/components/log/RestTimer", () => ({
  RestTimer: () => null,
}));
vi.mock("@/components/log/TemplatePicker", () => ({
  TemplatePicker: () => null,
}));
vi.mock("@/components/log/MovementRow", () => ({
  MovementRow: () => <div data-testid="movement-row" />,
}));
vi.mock("@/components/ui/page-header", () => ({
  PageHeader: () => null,
}));
vi.mock("@/lib/hooks/useRestTimer", () => ({
  useRestTimer: () => ({
    enabled: false,
    setEnabled: vi.fn(),
    duration: 90,
    setDuration: vi.fn(),
    remaining: 0,
    start: vi.fn(),
    stop: vi.fn(),
  }),
}));

import { LogPageClient } from "@/components/log/LogPageClient";

const baseProps = {
  accessToken: "tok",
  recentWorkouts: [],
  isFirstWorkout: false,
};

describe("LogPageClient — NL input toggle", () => {
  it("renders the 'or describe your workout' toggle", () => {
    render(<LogPageClient {...baseProps} />);
    expect(screen.getByText("or describe your workout")).toBeDefined();
  });

  it("NL area wrapper has collapsed CSS grid class by default", () => {
    render(<LogPageClient {...baseProps} />);
    // CSS grid row approach: grid-rows-[0fr] = collapsed, grid-rows-[1fr] = expanded
    const wrapper = document.getElementById("nl-input-region");
    expect(wrapper?.className).toContain("grid-rows-[0fr]");
    expect(wrapper?.className).not.toContain("grid-rows-[1fr]");
  });

  it("expands NL area when toggle is clicked", async () => {
    render(<LogPageClient {...baseProps} />);
    fireEvent.click(screen.getByText("or describe your workout"));
    await waitFor(() => {
      const wrapper = document.getElementById("nl-input-region");
      expect(wrapper?.className).toContain("grid-rows-[1fr]");
    });
  });

  it("shows 'Parse with AI' button and 'or browse movements ↓' link when expanded", async () => {
    render(<LogPageClient {...baseProps} />);
    fireEvent.click(screen.getByText("or describe your workout"));
    await waitFor(() => {
      expect(screen.getByTestId("parse-with-ai-btn")).toBeDefined();
      expect(screen.getByText(/or browse movements/)).toBeDefined();
    });
  });

  it("Parse with AI button is disabled when textarea is empty", async () => {
    render(<LogPageClient {...baseProps} />);
    fireEvent.click(screen.getByText("or describe your workout"));
    await waitFor(() => {
      const btn = screen.getByTestId("parse-with-ai-btn") as HTMLButtonElement;
      expect(btn.disabled).toBe(true);
    });
  });

  it("Parse with AI button enables when textarea has enough text", async () => {
    render(<LogPageClient {...baseProps} />);
    fireEvent.click(screen.getByText("or describe your workout"));
    const textarea = screen.getByPlaceholderText(/3×5 back squat/);
    fireEvent.change(textarea, { target: { value: "3x5 back squat 100kg" } });
    await waitFor(() => {
      const btn = screen.getByTestId("parse-with-ai-btn") as HTMLButtonElement;
      expect(btn.disabled).toBe(false);
    });
  });
});
