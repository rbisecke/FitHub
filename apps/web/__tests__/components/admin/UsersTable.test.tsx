// @vitest-environment jsdom
/**
 * User management table (`08` §6). Locks in the two riskiest interactions:
 * the pending-onboarding badge (so a null-display-name/zero-activity row
 * reads as "hasn't finished onboarding," not a data glitch), and the typed
 * delete confirmation gate — the Delete action must stay disabled until the
 * admin types the target's exact display name, never a plain confirm click.
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { axe } from "vitest-axe";
import type { AdminUser } from "@/lib/api";

const disableUserMock = vi.fn();
const deleteUserMock = vi.fn();
const generateMagicLinkMock = vi.fn();

vi.mock("@/lib/api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/client")>();
  return {
    ...actual,
    api: {
      ...actual.api,
      admin: {
        ...actual.api.admin,
        disableUser: (...args: unknown[]) => disableUserMock(...args),
        deleteUser: (...args: unknown[]) => deleteUserMock(...args),
        generateMagicLink: (...args: unknown[]) =>
          generateMagicLinkMock(...args),
      },
    },
  };
});

import { UsersTable } from "@/components/admin/UsersTable";

function user(overrides: Partial<AdminUser>): AdminUser {
  return {
    user_id: "11111111-1111-1111-1111-111111111111",
    email: "member@example.com",
    display_name: "Alex Rivera",
    created_at: "2026-06-01T00:00:00Z",
    banned_until: null,
    interactions_30d: 4,
    ...overrides,
  };
}

beforeEach(() => {
  disableUserMock.mockReset();
  deleteUserMock.mockReset();
  generateMagicLinkMock.mockReset();
});

describe("UsersTable", () => {
  it("badges a pre-onboarding user (null display_name, zero activity) instead of a bare row", () => {
    const preOnboarding = user({
      user_id: "22222222-2222-2222-2222-222222222222",
      display_name: null,
      email: null,
      interactions_30d: 0,
    });
    render(
      <UsersTable
        token="tok"
        initialUsers={[preOnboarding]}
        initialLoadFailed={false}
      />,
    );
    expect(screen.getByText("Pending onboarding")).toBeTruthy();
    expect(screen.getByText(preOnboarding.user_id)).toBeTruthy();
  });

  it("keeps the Delete action disabled until the typed text matches the display name exactly", () => {
    const target = user({});
    render(
      <UsersTable
        token="tok"
        initialUsers={[target]}
        initialLoadFailed={false}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: `Actions for ${target.display_name}`,
      }),
    );
    fireEvent.click(screen.getByText("Delete"));

    expect(screen.getByText("Delete this user?")).toBeTruthy();
    const confirmButtons = screen.getAllByRole("button", { name: "Delete" });
    const dialogDeleteButton = confirmButtons[confirmButtons.length - 1]!;
    expect(dialogDeleteButton).toHaveProperty("disabled", true);

    const input = screen.getByLabelText(/Type .* to confirm/);
    fireEvent.change(input, { target: { value: "not quite right" } });
    expect(dialogDeleteButton).toHaveProperty("disabled", true);

    fireEvent.change(input, { target: { value: target.display_name } });
    expect(dialogDeleteButton).toHaveProperty("disabled", false);
  });

  // Effort 11.5 axe coverage gap-fill (Domain 08, Effort 10 — Admin Console):
  // the operator's main user-management surface had zero automated a11y
  // coverage. Covers the base table plus the delete-confirmation dialog,
  // whose "Type X to confirm" input was the only htmlFor/id pairing found in
  // this domain during the audit (confirms it's genuinely well-formed, not
  // just quiet under jsdom).
  it("has no axe violations in the base table", async () => {
    const { container } = render(
      <UsersTable
        token="tok"
        initialUsers={[user({}), user({ user_id: "3", display_name: null })]}
        initialLoadFailed={false}
      />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has no axe violations with the delete-confirmation dialog open", async () => {
    const target = user({});
    const { container } = render(
      <UsersTable
        token="tok"
        initialUsers={[target]}
        initialLoadFailed={false}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: `Actions for ${target.display_name}`,
      }),
    );
    fireEvent.click(screen.getByText("Delete"));
    await screen.findByText("Delete this user?");
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
