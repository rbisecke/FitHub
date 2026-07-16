// @vitest-environment jsdom
/**
 * Regression test for AdminHeader's breadcrumb logic (SECTION_LABELS lookup).
 *
 * A prior bug: /admin/infra was missing from SECTION_LABELS, so the
 * breadcrumb silently fell back to "admin" instead of showing "infra".
 * This locks in the correct label for every known admin route, plus the
 * fallback behavior for an unknown path, so a missing route entry fails
 * loudly instead of silently regressing.
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

const mockUsePathname = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

import { AdminHeader } from "@/components/admin/AdminHeader";

describe("AdminHeader — breadcrumb", () => {
  it.each([
    ["/admin", "metrics"],
    ["/admin/access", "access"],
    ["/admin/users", "users"],
    ["/admin/health", "health"],
    ["/admin/infra", "infra"],
  ])("renders '%s' as breadcrumb section '%s'", (pathname, expected) => {
    mockUsePathname.mockReturnValue(pathname);
    render(<AdminHeader />);
    expect(screen.getByText(expected)).toBeDefined();
  });

  it("falls back to 'admin' for an unknown path", () => {
    mockUsePathname.mockReturnValue("/admin/some-new-unmapped-route");
    render(<AdminHeader />);
    // "admin" is always rendered (the first breadcrumb segment); scope the
    // assertion to the section segment to confirm the fallback fired rather
    // than silently matching a real section label.
    expect(screen.getAllByText("admin").length).toBeGreaterThan(0);
    expect(screen.queryByText("metrics")).toBeNull();
    expect(screen.queryByText("access")).toBeNull();
    expect(screen.queryByText("users")).toBeNull();
    expect(screen.queryByText("health")).toBeNull();
    expect(screen.queryByText("infra")).toBeNull();
  });
});
