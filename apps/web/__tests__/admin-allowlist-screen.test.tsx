// @vitest-environment jsdom
/**
 * Invite allowlist management (`08` §9). Locks in the single most
 * consequential detail of this screen: removing an already-*used* email is
 * the dangerous case (it 403s that user out of the whole API on their next
 * request), but the backend's confirm requirement doesn't distinguish used
 * from unused invites — so the same `AlertDialog` with the same literal
 * copy must render for both, never two different confirmation flows.
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AdminInvitedEmail } from "@/lib/api";

const addInvitedEmailMock = vi.fn();
const removeInvitedEmailMock = vi.fn();

vi.mock("@/lib/api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/client")>();
  return {
    ...actual,
    api: {
      ...actual.api,
      admin: {
        ...actual.api.admin,
        addInvitedEmail: (...args: unknown[]) => addInvitedEmailMock(...args),
        removeInvitedEmail: (...args: unknown[]) =>
          removeInvitedEmailMock(...args),
      },
    },
  };
});

import { AllowlistScreen } from "@/components/admin/AllowlistScreen";

function row(overrides: Partial<AdminInvitedEmail>): AdminInvitedEmail {
  return {
    id: "row-1",
    email: "someone@example.com",
    invited_at: "2026-07-01T12:00:00Z",
    used_at: null,
    ...overrides,
  };
}

const DIALOG_TITLE = "Remove this email from the allowlist?";
const DIALOG_BODY =
  "This email has already been used to create an account. Removing it here does not delete that account, but blocks any future re-invite to this address without adding it back.";

beforeEach(() => {
  addInvitedEmailMock.mockReset();
  removeInvitedEmailMock.mockReset();
});

describe("AllowlistScreen — remove confirmation dialog", () => {
  it("shows the identical literal title and body for an UNUSED email", () => {
    const unused = row({ id: "unused-1", used_at: null });
    render(
      <AllowlistScreen
        token="tok"
        initialEmails={[unused]}
        initialLoadFailed={false}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(screen.getByText(DIALOG_TITLE)).toBeTruthy();
    expect(screen.getByText(DIALOG_BODY)).toBeTruthy();
  });

  it("shows the SAME literal title and body for a USED (consumed) email", () => {
    const used = row({
      id: "used-1",
      used_at: "2026-07-10T09:00:00Z",
    });
    render(
      <AllowlistScreen
        token="tok"
        initialEmails={[used]}
        initialLoadFailed={false}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(screen.getByText(DIALOG_TITLE)).toBeTruthy();
    expect(screen.getByText(DIALOG_BODY)).toBeTruthy();
  });

  it("labels a consumed row distinctly from an unused row with a text label (never color alone)", () => {
    const unused = row({ id: "unused-2", used_at: null });
    const used = row({
      id: "used-2",
      email: "spent@example.com",
      used_at: "2026-07-10T09:00:00Z",
    });
    render(
      <AllowlistScreen
        token="tok"
        initialEmails={[used, unused]}
        initialLoadFailed={false}
      />,
    );
    expect(screen.getByText("Consumed")).toBeTruthy();
    expect(screen.getByText("Unused")).toBeTruthy();
  });

  it("shows an inline non-destructive message on a 409 add conflict, not a dialog", async () => {
    const { ApiError } = await import("@/lib/api/client");
    addInvitedEmailMock.mockRejectedValue(
      new ApiError(409, "API 409: /api/v1/admin/invited-emails"),
    );
    render(
      <AllowlistScreen
        token="tok"
        initialEmails={[]}
        initialLoadFailed={false}
      />,
    );
    fireEvent.change(screen.getByLabelText("Email to add to the allowlist"), {
      target: { value: "dup@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add email" }));
    expect(
      await screen.findByText("That email is already on the list."),
    ).toBeTruthy();
    // Non-destructive: no confirmation dialog for the add path.
    expect(screen.queryByText(DIALOG_TITLE)).toBeNull();
  });
});
