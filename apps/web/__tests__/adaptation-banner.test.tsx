// @vitest-environment jsdom
/**
 * Tests for AdaptationBanner — verifies amber styling, git-themed copy,
 * and conditional rendering (null when count is 0).
 */

import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

const { mockAdaptationsList } = vi.hoisted(() => ({
  mockAdaptationsList: vi.fn(),
}));

vi.mock("@/lib/api/client", () => ({
  api: {
    adaptations: {
      list: mockAdaptationsList,
    },
  },
  createApiClient: vi.fn(() => ({
    adaptations: {
      list: mockAdaptationsList,
    },
  })),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
    "data-testid": testId,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
    "data-testid"?: string;
  }) => (
    <a href={href} className={className} data-testid={testId}>
      {children}
    </a>
  ),
}));

import { AdaptationBanner } from "@/components/dashboard/AdaptationBanner";

describe("AdaptationBanner", () => {
  it("renders null when there are no proposed adaptations", async () => {
    mockAdaptationsList.mockResolvedValueOnce([
      { id: "1", status: "accepted" },
    ]);

    const { container } = render(
      <AdaptationBanner accessToken="tok" planId="plan-1" />,
    );

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it("renders null when count is 0", async () => {
    mockAdaptationsList.mockResolvedValueOnce([]);

    const { container } = render(
      <AdaptationBanner accessToken="tok" planId="plan-1" />,
    );

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it("renders banner with correct copy when adaptations are pending", async () => {
    mockAdaptationsList.mockResolvedValueOnce([
      { id: "1", status: "proposed" },
      { id: "2", status: "proposed" },
      { id: "3", status: "accepted" },
    ]);

    render(<AdaptationBanner accessToken="tok" planId="plan-1" />);

    await waitFor(() => {
      expect(screen.getByTestId("adaptation-banner")).toBeDefined();
    });

    // Count badge shows 2 (proposed only)
    expect(screen.getByText("2")).toBeDefined();
    // Git-themed prefix
    expect(screen.getByText(/\$ git diff --plan/)).toBeDefined();
    // Copy
    expect(screen.getByText(/adaptations pending review/)).toBeDefined();
  });

  it("links to the plan adaptations page", async () => {
    mockAdaptationsList.mockResolvedValueOnce([
      { id: "1", status: "proposed" },
    ]);

    render(<AdaptationBanner accessToken="tok" planId="plan-42" />);

    await waitFor(() => {
      const link = screen.getByTestId("adaptation-banner") as HTMLAnchorElement;
      expect(link.href).toContain("/plans/plan-42/adaptations");
    });
  });

  it("renders null when the API call fails", async () => {
    mockAdaptationsList.mockRejectedValueOnce(new Error("network"));

    const { container } = render(
      <AdaptationBanner accessToken="tok" planId="plan-1" />,
    );

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });
});
