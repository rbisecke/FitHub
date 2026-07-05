// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { NotifyToggle } from "@/components/integrations/NotifyToggle";

// Node 26 has an experimental (non-functional) localStorage global.
// Stub it with a real in-memory implementation so component logic works.
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => {
    store[key] = value;
  },
  removeItem: (key: string) => {
    delete store[key];
  },
  clear: () => {
    Object.keys(store).forEach((k) => delete store[k]);
  },
};
vi.stubGlobal("localStorage", localStorageMock);

// Make requestAnimationFrame fire its callback synchronously so effects resolve
// within act() without needing fake timers.
vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
  cb(0);
  return 0;
});
vi.stubGlobal("cancelAnimationFrame", () => {});

beforeEach(() => {
  localStorageMock.clear();
});

describe("NotifyToggle", () => {
  it("renders 'Notify me' by default", async () => {
    await act(async () => {
      render(<NotifyToggle slug="oura" />);
    });
    expect(screen.getByRole("button").textContent).toBe("Notify me");
  });

  it("switches to 'Notified ✓' on click and persists to localStorage", async () => {
    await act(async () => {
      render(<NotifyToggle slug="oura" />);
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
    });
    expect(screen.getByRole("button").textContent).toBe("Notified ✓");
    expect(localStorage.getItem("notify_interest_oura")).toBe("true");
  });

  it("toggles back to 'Notify me' on second click and removes localStorage entry", async () => {
    await act(async () => {
      render(<NotifyToggle slug="strava" />);
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
    });
    expect(screen.getByRole("button").textContent).toBe("Notify me");
    expect(localStorage.getItem("notify_interest_strava")).toBeNull();
  });

  it("reads existing localStorage state on mount", async () => {
    localStorage.setItem("notify_interest_garmin", "true");
    await act(async () => {
      render(<NotifyToggle slug="garmin" />);
    });
    expect(screen.getByRole("button").textContent).toBe("Notified ✓");
  });

  it("button includes min-h-[44px] for WCAG touch target compliance", async () => {
    await act(async () => {
      render(<NotifyToggle slug="oura" />);
    });
    expect(screen.getByRole("button").className).toContain("min-h-[44px]");
  });

  it("three slugs are independent — toggling oura does not affect strava", async () => {
    const { unmount } = render(<NotifyToggle slug="oura" />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
    });
    unmount();

    await act(async () => {
      render(<NotifyToggle slug="strava" />);
    });
    expect(screen.getByRole("button").textContent).toBe("Notify me");
  });
});
