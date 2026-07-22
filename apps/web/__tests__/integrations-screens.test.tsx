// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import { IntegrationsListScreen } from "@/components/integrations/IntegrationsListScreen";
import { AppleHealthScreen } from "@/components/integrations/AppleHealthScreen";
import type { ConnectionStatus, IntegrationDetail } from "@/lib/api";

const listMock = vi.fn();
const detailMock = vi.fn();
const connectMock = vi.fn();
const revokeMock = vi.fn();

vi.mock("@/lib/api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/client")>();
  return {
    ...actual,
    api: {
      ...actual.api,
      integrations: {
        list: (...args: unknown[]) => listMock(...args),
        appleHealthDetail: (...args: unknown[]) => detailMock(...args),
        connectAppleHealth: (...args: unknown[]) => connectMock(...args),
        revokeAppleHealth: (...args: unknown[]) => revokeMock(...args),
      },
    },
  };
});

function connection(overrides: Partial<ConnectionStatus>): ConnectionStatus {
  return {
    provider: "apple_health",
    sync_status: "idle",
    last_synced_at: null,
    token_prefix: null,
    ...overrides,
  };
}

function detail(overrides: Partial<IntegrationDetail>): IntegrationDetail {
  return {
    provider: "apple_health",
    sync_status: "idle",
    last_synced_at: null,
    token_prefix: "fh_ah_abc123",
    last_sync_rows_inserted: null,
    last_sync_recovery_computed: null,
    last_sync_error: null,
    ...overrides,
  };
}

beforeEach(() => {
  listMock.mockReset();
  detailMock.mockReset();
  connectMock.mockReset();
  revokeMock.mockReset();
  Object.assign(navigator, {
    clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
});

describe("IntegrationsListScreen", () => {
  it("shows the connect CTA and coming-soon cards (no Whoop) when nothing is connected", () => {
    render(
      <IntegrationsListScreen
        token="tok"
        initialConnections={[]}
        initialLoadFailed={false}
      />,
    );
    expect(
      screen.getByText(/Connect a source to feed your recovery score/i),
    ).toBeTruthy();
    expect(screen.getByText("Oura")).toBeTruthy();
    expect(screen.getByText("Strava")).toBeTruthy();
    expect(screen.getByText("Garmin")).toBeTruthy();
    expect(screen.queryByText("Whoop")).toBeNull();
  });

  it("renders a Connected pill and relative sync time for an idle, synced connection", () => {
    const now = new Date().toISOString();
    render(
      <IntegrationsListScreen
        token="tok"
        initialConnections={[connection({ last_synced_at: now })]}
        initialLoadFailed={false}
      />,
    );
    expect(screen.getByText("Connected")).toBeTruthy();
    expect(screen.getByText(/just now/i)).toBeTruthy();
  });

  it("renders Awaiting first sync as a passive (non-error) state", () => {
    render(
      <IntegrationsListScreen
        token="tok"
        initialConnections={[connection({ last_synced_at: null })]}
        initialLoadFailed={false}
      />,
    );
    expect(screen.getByText("Awaiting first sync")).toBeTruthy();
  });

  it("renders a Sync error pill for an errored connection", () => {
    render(
      <IntegrationsListScreen
        token="tok"
        initialConnections={[connection({ sync_status: "error" })]}
        initialLoadFailed={false}
      />,
    );
    expect(screen.getByText("Sync error")).toBeTruthy();
  });

  it("shows a distinct retry state on load failure and refetches on retry", async () => {
    listMock.mockResolvedValueOnce([connection({ last_synced_at: null })]);
    render(
      <IntegrationsListScreen
        token="tok"
        initialConnections={[]}
        initialLoadFailed={true}
      />,
    );
    expect(screen.getByText(/Couldn't load your integrations/i)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /^retry$/i }));

    await waitFor(() =>
      expect(listMock).toHaveBeenCalledWith("tok", expect.anything()),
    );
    expect(await screen.findByText("Awaiting first sync")).toBeTruthy();
  });
});

describe("AppleHealthScreen", () => {
  it("mints a token and shows the shown-once instructions screen", async () => {
    connectMock.mockResolvedValueOnce({
      token: "fh_ah_supersecrettoken",
      token_prefix: "fh_ah_super",
      ingest_url:
        "https://api.example.com/api/v1/integrations/apple-health/sync",
    });
    render(
      <AppleHealthScreen
        token="tok"
        initialDetail={null}
        initialLoadFailed={false}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /connect apple health/i }),
    );

    expect(await screen.findByText(/shown once/i)).toBeTruthy();
    expect(screen.getByText("fh_ah_supersecrettoken")).toBeTruthy();
    expect(
      screen.getByText(
        "https://api.example.com/api/v1/integrations/apple-health/sync",
      ),
    ).toBeTruthy();
  });

  it("shows a Copied affirmation on the copy button itself", async () => {
    connectMock.mockResolvedValueOnce({
      token: "fh_ah_supersecrettoken",
      token_prefix: "fh_ah_super",
      ingest_url: "https://example.com/sync",
    });
    render(
      <AppleHealthScreen
        token="tok"
        initialDetail={null}
        initialLoadFailed={false}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /connect apple health/i }),
    );
    await screen.findByText(/shown once/i);

    fireEvent.click(screen.getByRole("button", { name: /copy bearer token/i }));
    expect(
      await screen.findByRole("button", { name: /copied bearer token/i }),
    ).toBeTruthy();
  });

  it("shows a rate-limit message, never a raw error, on 429", async () => {
    const { ApiError } = await import("@/lib/api/client");
    connectMock.mockRejectedValueOnce(new ApiError(429, "rate limited"));
    render(
      <AppleHealthScreen
        token="tok"
        initialDetail={null}
        initialLoadFailed={false}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /connect apple health/i }),
    );
    expect(
      await screen.findByText(/too many connection attempts/i),
    ).toBeTruthy();
  });

  it("moves from instructions to the detail screen on Got it, masking the token", async () => {
    connectMock.mockResolvedValueOnce({
      token: "fh_ah_supersecrettoken",
      token_prefix: "fh_ah_super",
      ingest_url: "https://example.com/sync",
    });
    detailMock.mockResolvedValueOnce(detail({ token_prefix: "fh_ah_super" }));
    render(
      <AppleHealthScreen
        token="tok"
        initialDetail={null}
        initialLoadFailed={false}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /connect apple health/i }),
    );
    await screen.findByText(/shown once/i);

    fireEvent.click(screen.getByRole("button", { name: /^got it$/i }));

    expect(await screen.findByText(/fh_ah_super••••••••/)).toBeTruthy();
    expect(screen.queryByText("fh_ah_supersecrettoken")).toBeNull();
  });

  it("regenerate warns about breaking HAE, then re-enters the instructions state", async () => {
    connectMock.mockResolvedValueOnce({
      token: "fh_ah_newtoken",
      token_prefix: "fh_ah_newpre",
      ingest_url: "https://example.com/sync",
    });
    render(
      <AppleHealthScreen
        token="tok"
        initialDetail={detail({ token_prefix: "fh_ah_oldpre" })}
        initialLoadFailed={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /regenerate token/i }));
    expect(
      await screen.findByText(/stop working until you paste/i),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /^regenerate$/i }));

    await waitFor(() => expect(connectMock).toHaveBeenCalledWith("tok"));
    expect(await screen.findByText("fh_ah_newtoken")).toBeTruthy();
  });

  it("disconnect confirms, then returns to a first-time-indistinguishable connect state", async () => {
    revokeMock.mockResolvedValueOnce(undefined);
    render(
      <AppleHealthScreen
        token="tok"
        initialDetail={detail({})}
        initialLoadFailed={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /^disconnect$/i }));
    expect(
      await screen.findByText(/already-synced metrics stay in your history/i),
    ).toBeTruthy();

    const dialog = screen.getByRole("dialog");
    fireEvent.click(
      within(dialog).getByRole("button", { name: /^disconnect$/i }),
    );

    await waitFor(() => expect(revokeMock).toHaveBeenCalledWith("tok"));
    expect(
      await screen.findByRole("button", { name: /connect apple health/i }),
    ).toBeTruthy();
  });
});
