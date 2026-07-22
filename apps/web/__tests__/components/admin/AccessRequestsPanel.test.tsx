// @vitest-environment jsdom
/**
 * Access requests queue (`08` §5). Locks in the two state-heaviest behaviors:
 * the empty-pending steady state, and the concurrency race — a PATCH that
 * 404s because another admin already reviewed the request must render a
 * graceful "already handled" inline state, never a hard error.
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AdminAccessRequest } from "@/lib/api";

const reviewAccessRequestMock = vi.fn();
const accessRequestsMock = vi.fn();

vi.mock("@/lib/api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/client")>();
  return {
    ...actual,
    api: {
      ...actual.api,
      admin: {
        ...actual.api.admin,
        reviewAccessRequest: (...args: unknown[]) =>
          reviewAccessRequestMock(...args),
        accessRequests: (...args: unknown[]) => accessRequestsMock(...args),
      },
    },
  };
});

import { AccessRequestsPanel } from "@/components/admin/AccessRequestsPanel";

function request(overrides: Partial<AdminAccessRequest>): AdminAccessRequest {
  return {
    id: "req-1",
    created_at: "2026-07-01T12:00:00Z",
    email: "someone@example.com",
    name: "Someone",
    motivation: "A friend recommended it.",
    status: "pending",
    reviewed_at: null,
    reviewed_by: null,
    review_note: null,
    ...overrides,
  };
}

beforeEach(() => {
  reviewAccessRequestMock.mockReset();
  accessRequestsMock.mockReset();
});

describe("AccessRequestsPanel", () => {
  it('shows "No requests waiting." for an empty pending queue', () => {
    render(
      <AccessRequestsPanel
        initial={[]}
        initialLoadFailed={false}
        users={[]}
        token="tok"
      />,
    );
    expect(screen.getByText("No requests waiting.")).toBeTruthy();
  });

  it("renders a graceful already-handled state on a 404 concurrency race, not a hard error", async () => {
    const { ApiError } = await import("@/lib/api/client");
    const pending = request({ id: "req-2" });
    reviewAccessRequestMock.mockRejectedValue(
      new ApiError(404, "API 404: /api/v1/admin/access-requests/req-2"),
    );
    // The reconciliation refetch (triggered after the 404) — not exercised
    // for the 404 branch specifically, but stubbed so it never throws if
    // called.
    accessRequestsMock.mockResolvedValue([pending]);

    render(<AccessRequestsPanel initial={[pending]} users={[]} token="tok" />);

    fireEvent.click(screen.getByRole("button", { name: /Approve/ }));

    expect(
      await screen.findByText("This request was already handled."),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Approve/ })).toBeNull();
  });

  it("reconciles a non-404 approve failure against the server truth and shows the invite-unconfirmed note when it actually committed", async () => {
    const pending = request({ id: "req-3" });
    const approved = request({
      id: "req-3",
      status: "approved",
      reviewed_at: "2026-07-02T12:00:00Z",
      reviewed_by: "admin-1",
    });
    reviewAccessRequestMock.mockRejectedValue(new Error("network blip"));
    accessRequestsMock.mockResolvedValue([approved]);

    render(<AccessRequestsPanel initial={[pending]} users={[]} token="tok" />);

    fireEvent.click(screen.getByRole("button", { name: /Approve/ }));

    // The row settles onto the Approved tab only after the (real, gated)
    // fill transition completes — wait for that reconciliation, then switch
    // tabs to see it.
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /Approve/ })).toBeNull(),
    );
    fireEvent.click(screen.getByRole("tab", { name: /approved/i }));

    expect(
      screen.getByText(
        "Invite email status unconfirmed — they can still sign in.",
      ),
    ).toBeTruthy();
  });

  it("does not blank a successfully-fetched queue when the users lookup came back empty (partial-failure fix)", () => {
    // Regression for the P1: the page used to fetch `accessRequests` and
    // `users` inside one `Promise.all`/`catch`, so a `users`-only failure
    // (e.g. a network blip fetching the magic-link lookup list) silently
    // rendered an empty "No requests waiting." queue — indistinguishable
    // from a genuinely empty queue. `users={[]}` here simulates that failed
    // lookup; the pending request itself must still render.
    const pending = request({ id: "req-4", email: "jordan@example.com" });
    render(
      <AccessRequestsPanel
        initial={[pending]}
        initialLoadFailed={false}
        users={[]}
        token="tok"
      />,
    );
    expect(screen.queryByText("No requests waiting.")).toBeNull();
    expect(screen.getByText("jordan@example.com")).toBeTruthy();
  });

  it("shows a retry affordance (not an empty queue) when the initial request-queue fetch itself failed", async () => {
    const pending = request({ id: "req-5" });
    accessRequestsMock.mockResolvedValue([pending]);

    render(
      <AccessRequestsPanel
        initial={null}
        initialLoadFailed={true}
        users={[]}
        token="tok"
      />,
    );

    expect(screen.queryByText("No requests waiting.")).toBeNull();
    expect(
      screen.getByText("Couldn't load access requests. Please try again."),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Retry/ }));

    expect(await screen.findByText("someone@example.com")).toBeTruthy();
  });
});
