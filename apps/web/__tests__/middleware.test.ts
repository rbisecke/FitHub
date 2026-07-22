/**
 * `/dev/*` production gating (P1 fix). Six of the ~30 `/dev/*` preview pages
 * render real privileged admin components (users table, cost dashboard,
 * allowlist CRUD) with fixture data and a hardcoded token — `middleware.ts`
 * used to only skip the auth-redirect bypass for `/dev/*` in production,
 * which let any signed-in *non-admin* member fall through to the ordinary
 * "must be logged in" check and see that operator surface. `/dev/*` must
 * now get a real 404 in production, with the existing non-production
 * preview behavior left untouched.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

const getUserMock = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: {
      getUser: getUserMock,
    },
  }),
}));

import { middleware } from "@/middleware";

function makeRequest(pathname: string): NextRequest {
  return new NextRequest(new Request(`https://fithub.test${pathname}`));
}

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

beforeEach(() => {
  getUserMock.mockReset();
  getUserMock.mockResolvedValue({ data: { user: null } });
});

afterEach(() => {
  vi.stubEnv("NODE_ENV", ORIGINAL_NODE_ENV ?? "test");
});

describe("middleware — /dev/* gating", () => {
  it("returns a real 404 for /dev/* in production, without ever checking auth", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const res = await middleware(makeRequest("/dev/users"));

    expect(res.status).toBe(404);
    expect(getUserMock).not.toHaveBeenCalled();
  });

  it("404s every /dev/* preview in production, not just the admin ones", async () => {
    vi.stubEnv("NODE_ENV", "production");

    for (const path of [
      "/dev",
      "/dev/admin-cost",
      "/dev/admin-infra",
      "/dev/allowlist",
      "/dev/knowledge-base",
      "/dev/access-requests",
      "/dev/buttons",
    ]) {
      const res = await middleware(makeRequest(path));
      expect(res.status).toBe(404);
    }
  });

  it("does not 404 a similarly-named sibling route (/devices) in production", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const res = await middleware(makeRequest("/devices"));

    // Falls through to the ordinary signed-out redirect, not a 404.
    expect(res.status).not.toBe(404);
  });

  it("still allows unauthenticated access to /dev/* outside production (existing local-preview behavior)", async () => {
    vi.stubEnv("NODE_ENV", "test");

    const res = await middleware(makeRequest("/dev/users"));

    expect(res.status).not.toBe(404);
    // Not redirected to /login — the dev-preview bypass still applies.
    expect(res.headers.get("location")).toBeNull();
  });

  it("still redirects an unauthenticated request to a normal route to /login in production", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const res = await middleware(makeRequest("/today"));

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
  });
});
