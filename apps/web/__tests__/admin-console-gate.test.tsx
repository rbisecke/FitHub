// @vitest-environment jsdom
/**
 * The admin console is desktop-only, ≥768px (`08` §4) — a stated design
 * decision, not a responsive-layout gap. Below that breakpoint the gate must
 * render the "best viewed on a larger screen" notice in place of the console
 * body; at/above it, the real console children must render untouched.
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

const mockUseIsMobile = vi.fn();

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => mockUseIsMobile(),
}));

import { AdminConsoleGate } from "@/components/admin/AdminConsoleGate";

describe("AdminConsoleGate", () => {
  it("renders the desktop-only notice below the 768px breakpoint", () => {
    mockUseIsMobile.mockReturnValue(true);
    render(
      <AdminConsoleGate>
        <div>Console body</div>
      </AdminConsoleGate>,
    );
    expect(screen.getByText("Best viewed on a larger screen")).toBeDefined();
    expect(screen.queryByText("Console body")).toBeNull();
  });

  it("renders the real console children at/above the breakpoint", () => {
    mockUseIsMobile.mockReturnValue(false);
    render(
      <AdminConsoleGate>
        <div>Console body</div>
      </AdminConsoleGate>,
    );
    expect(screen.getByText("Console body")).toBeDefined();
    expect(screen.queryByText("Best viewed on a larger screen")).toBeNull();
  });
});
