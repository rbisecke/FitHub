// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NotificationPanel } from "@/components/notifications/NotificationPanel";
import type { Notification } from "@/lib/api";

vi.mock("@/lib/api/client", () => ({
  api: {
    notifications: {
      list: vi.fn().mockResolvedValue([]),
      markRead: vi.fn(),
    },
  },
}));

function makeNotif(overrides: Partial<Notification>): Notification {
  return {
    id: "n1",
    user_id: "u1",
    type: "team_session_linked",
    payload: {},
    read_at: null,
    created_at: new Date(Date.now() - 3600000).toISOString(),
    ...overrides,
  };
}

describe("NotificationPanel", () => {
  it("renders empty state when no notifications", async () => {
    render(
      <NotificationPanel
        accessToken="tok"
        initialNotifications={[]}
        mode="dropdown"
      />,
    );
    // Wait for the async fetch to resolve and loading state to clear
    expect(await screen.findByText(/No activity yet/i)).toBeTruthy();
  });

  it("renders notification messages for team_session_linked type", async () => {
    const notifs = [
      makeNotif({
        type: "team_session_linked",
        payload: {
          actor_name: "Alex",
          session_name: "Wed WOD",
          team_session_id: "ts1",
        },
      }),
    ];
    render(
      <NotificationPanel
        accessToken="tok"
        initialNotifications={notifs}
        mode="dropdown"
      />,
    );
    expect(screen.getByText(/Alex linked their workout/i)).toBeTruthy();
  });

  it("renders 'mark all as read' when there are unread notifications", async () => {
    const notifs = [makeNotif({ type: "team_session_updated", read_at: null })];
    render(
      <NotificationPanel
        accessToken="tok"
        initialNotifications={notifs}
        mode="dropdown"
      />,
    );
    expect(screen.getByText(/mark all as read/i)).toBeTruthy();
  });

  it("does not render 'mark all as read' when all notifications are read", async () => {
    const notifs = [
      makeNotif({
        type: "team_session_updated",
        read_at: new Date().toISOString(),
      }),
    ];
    render(
      <NotificationPanel
        accessToken="tok"
        initialNotifications={notifs}
        mode="dropdown"
      />,
    );
    expect(screen.queryByText(/mark all as read/i)).toBeNull();
  });
});
