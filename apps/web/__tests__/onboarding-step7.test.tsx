// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Step7FirstAction } from "@/components/onboarding/Step7FirstAction";

const pushMock = vi.fn();
const patchMock = vi.fn().mockResolvedValue({});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/lib/api/client", () => ({
  api: { profile: { patch: (...args: unknown[]) => patchMock(...args) } },
}));

describe("Step7FirstAction", () => {
  const noop = () => {};

  it("renders the $ git commit option", () => {
    render(<Step7FirstAction token="t" onSkip={noop} />);
    expect(screen.getByText("$ git commit")).toBeDefined();
    expect(screen.getByText("Log a workout")).toBeDefined();
  });

  it("renders the $ git tag option", () => {
    render(<Step7FirstAction token="t" onSkip={noop} />);
    expect(screen.getByText("$ git tag")).toBeDefined();
    expect(screen.getByText("Tag a PR")).toBeDefined();
  });

  it("renders a Skip for now button", () => {
    render(<Step7FirstAction token="t" onSkip={noop} />);
    expect(screen.getByText("Skip for now")).toBeDefined();
  });

  it("best-effort completes onboarding then routes to /log/new on 'Log a workout'", async () => {
    render(<Step7FirstAction token="t" onSkip={noop} />);
    fireEvent.click(screen.getByLabelText("Log a full workout session"));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/log/new"));
    expect(patchMock).toHaveBeenCalledWith("t", { onboarding_completed: true });
  });

  it("best-effort completes onboarding then routes to /log/tag on 'Tag a PR'", async () => {
    render(<Step7FirstAction token="t" onSkip={noop} />);
    fireEvent.click(
      screen.getByLabelText("Tag a personal record or milestone"),
    );
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/log/tag"));
    expect(patchMock).toHaveBeenCalledWith("t", { onboarding_completed: true });
  });

  it("navigates even when the best-effort patch fails", async () => {
    patchMock.mockRejectedValueOnce(new Error("network error"));
    render(<Step7FirstAction token="t" onSkip={noop} />);
    fireEvent.click(screen.getByLabelText("Log a full workout session"));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/log/new"));
  });
});
