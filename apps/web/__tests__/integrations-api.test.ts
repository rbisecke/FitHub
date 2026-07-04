/**
 * Unit tests for the integrations API client methods.
 * These verify the client correctly maps to the right endpoints.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Stub fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  vi.resetAllMocks();
  mockFetch.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => [],
  });
});

describe("integrations API client", () => {
  it("list calls GET /api/v1/integrations", async () => {
    const { api } = await import("@/lib/api/client");
    await api.integrations.list("tok").catch(() => undefined);
    const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/api/v1/integrations");
  });

  it("connectAppleHealth calls POST /api/v1/integrations/apple-health/connect", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        token: "fh_ah_xxx",
        token_prefix: "fh_ah_xxx",
        ingest_url:
          "http://localhost:8000/api/v1/integrations/apple-health/sync",
      }),
    });
    const { api } = await import("@/lib/api/client");
    const res = await api.integrations.connectAppleHealth("tok");
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/api/v1/integrations/apple-health/connect");
    expect(init.method).toBe("POST");
    expect(res.token).toBe("fh_ah_xxx");
  });

  it("revokeAppleHealth calls DELETE /api/v1/integrations/apple-health/token", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: async () => undefined,
    });
    const { api } = await import("@/lib/api/client");
    await api.integrations.revokeAppleHealth("tok");
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/api/v1/integrations/apple-health/token");
    expect(init.method).toBe("DELETE");
  });
});
