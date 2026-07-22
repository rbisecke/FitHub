// @vitest-environment jsdom
/**
 * The infra strip's data fetch (`08` §4) degrades silently to "unknown" for
 * all three sources on any failure — a network error or the 2.5s client-side
 * timeout look identical to the UI, since "unknown" is a normal, non-alarming
 * state here, not an error. This locks in that behavior plus the mandatory
 * AbortController-signal-forwarding pattern (apps/web/CLAUDE.md).
 */

import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

const mockInfraStatus = vi.fn();

vi.mock("@/lib/api/client", () => ({
  api: {
    admin: {
      infraStatus: (...args: unknown[]) => mockInfraStatus(...args),
    },
  },
}));

import { InfraStatusStrip } from "@/components/admin/InfraStatusStrip";

describe("InfraStatusStrip", () => {
  it("degrades to 'unknown' for all three sources when the fetch fails", async () => {
    mockInfraStatus.mockRejectedValue(new Error("network error"));
    render(<InfraStatusStrip accessToken="test-token" />);

    await waitFor(() => {
      expect(screen.getAllByText("unknown")).toHaveLength(3);
    });
  });

  it("forwards an AbortController signal to the API call", () => {
    mockInfraStatus.mockReturnValue(new Promise(() => {}));
    render(<InfraStatusStrip accessToken="test-token" />);

    expect(mockInfraStatus).toHaveBeenCalledWith(
      "test-token",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });
});
