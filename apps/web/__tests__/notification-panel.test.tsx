// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { axe } from "vitest-axe";
import { NotificationPanel } from "@/components/notifications/NotificationPanel";
import type { Notification } from "@/lib/api";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

const listMock = vi.fn().mockResolvedValue([]);
const markReadMock = vi.fn();
vi.mock("@/lib/api/client", () => ({
  api: {
    notifications: {
      list: (...args: unknown[]) => listMock(...args),
      markRead: (...args: unknown[]) => markReadMock(...args),
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
  it("renders the unread empty state by default", async () => {
    listMock.mockResolvedValueOnce([]);
    render(
      <NotificationPanel
        accessToken="tok"
        initialNotifications={[]}
        mode="dropdown"
      />,
    );
    expect(await screen.findByText(/You're all caught up/i)).toBeTruthy();
  });

  it("renders the all-filter empty state after toggling", async () => {
    listMock.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    render(
      <NotificationPanel
        accessToken="tok"
        initialNotifications={[]}
        mode="dropdown"
      />,
    );
    await screen.findByText(/You're all caught up/i);
    fireEvent.click(screen.getByRole("tab", { name: /all/i }));
    expect(await screen.findByText(/No notifications yet/i)).toBeTruthy();
    expect(listMock).toHaveBeenLastCalledWith("tok", true, expect.anything());
  });

  it("renders the actor-name-fixed message line for team_session_linked", async () => {
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
    listMock.mockResolvedValueOnce(notifs);
    render(
      <NotificationPanel
        accessToken="tok"
        initialNotifications={notifs}
        mode="dropdown"
      />,
    );
    expect(
      await screen.findByText(/Alex linked a result to 'Wed WOD'/i),
    ).toBeTruthy();
  });

  it("renders a Link result shortcut and the pending-link copy for workout_link_pending", async () => {
    const notifs = [
      makeNotif({
        type: "workout_link_pending",
        payload: {
          actor_name: "Sam",
          session_name: "Fri Team WOD",
          team_session_id: "ts2",
        },
      }),
    ];
    listMock.mockResolvedValueOnce(notifs);
    render(
      <NotificationPanel
        accessToken="tok"
        initialNotifications={notifs}
        mode="dropdown"
      />,
    );
    expect(
      await screen.findByText(
        /Sam added you to 'Fri Team WOD' — link your result/i,
      ),
    ).toBeTruthy();
    expect(screen.getByText(/Link result/i)).toBeTruthy();
  });

  it("never falls back to a generic 'Someone' — degrades to a nameless template instead", async () => {
    const notifs = [
      makeNotif({
        type: "team_session_updated",
        payload: { session_name: "Sat Metcon", team_session_id: "ts3" },
      }),
    ];
    listMock.mockResolvedValueOnce(notifs);
    render(
      <NotificationPanel
        accessToken="tok"
        initialNotifications={notifs}
        mode="dropdown"
      />,
    );
    expect(await screen.findByText(/'Sat Metcon' was updated/i)).toBeTruthy();
    expect(screen.queryByText(/Someone/i)).toBeNull();
  });

  it("disables 'Mark all read' when there are no unread notifications", async () => {
    const notifs = [
      makeNotif({
        type: "team_session_updated",
        read_at: new Date().toISOString(),
      }),
    ];
    listMock.mockResolvedValueOnce(notifs);
    render(
      <NotificationPanel
        accessToken="tok"
        initialNotifications={notifs}
        mode="dropdown"
      />,
    );
    await screen.findByText(/was updated/i);
    const btn = screen.getByRole("button", {
      name: /mark all read/i,
    }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it("enables 'Mark all read' when unread notifications exist", async () => {
    const notifs = [makeNotif({ type: "team_session_updated", read_at: null })];
    listMock.mockResolvedValueOnce(notifs);
    render(
      <NotificationPanel
        accessToken="tok"
        initialNotifications={notifs}
        mode="dropdown"
      />,
    );
    await screen.findByText(/was updated/i);
    const btn = screen.getByRole("button", {
      name: /mark all read/i,
    }) as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  it("tapping a row marks it read and navigates to the team-session detail route", async () => {
    const notifs = [
      makeNotif({
        id: "n42",
        type: "team_session_linked",
        payload: {
          actor_name: "Alex",
          session_name: "Wed WOD",
          team_session_id: "ts1",
        },
      }),
    ];
    listMock.mockResolvedValueOnce(notifs);
    markReadMock.mockResolvedValueOnce({
      ...notifs[0],
      read_at: new Date().toISOString(),
    });
    render(
      <NotificationPanel
        accessToken="tok"
        initialNotifications={notifs}
        mode="dropdown"
      />,
    );
    const row = await screen.findByText(/Alex linked a result/i);
    fireEvent.click(row);
    await waitFor(() =>
      expect(markReadMock).toHaveBeenCalledWith("tok", "n42"),
    );
    expect(pushMock).toHaveBeenCalledWith("/social/team-sessions/ts1");
  });

  // Effort 11.5 axe coverage gap-fill (Domain 07, Effort 9 — Integrations/
  // Notifications/Gamification): the dropdown had zero automated a11y
  // coverage despite being reachable from every shell page via the bell icon.
  it("has no axe violations with a populated, mixed read/unread list", async () => {
    const notifs = [
      makeNotif({
        id: "n1",
        type: "team_session_linked",
        payload: {
          actor_name: "Alex",
          session_name: "Wed WOD",
          team_session_id: "ts1",
        },
      }),
      makeNotif({
        id: "n2",
        type: "team_session_linked",
        read_at: new Date().toISOString(),
        payload: {
          actor_name: "Sam",
          session_name: "Thu row",
          team_session_id: "ts2",
        },
      }),
    ];
    listMock.mockResolvedValueOnce(notifs);
    const { container } = render(
      <NotificationPanel
        accessToken="tok"
        initialNotifications={notifs}
        mode="dropdown"
      />,
    );
    await screen.findByText(/Alex linked a result/i);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
