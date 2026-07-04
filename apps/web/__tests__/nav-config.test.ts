import { describe, it, expect } from "vitest";
import {
  isNavItemActive,
  getPageMeta,
  NAV_ITEMS,
} from "@/components/layout/nav-config";

describe("isNavItemActive", () => {
  it("matches /dashboard exactly", () => {
    expect(isNavItemActive("/dashboard", "/dashboard")).toBe(true);
  });

  it("does not match /dashboard/anything (exact match only)", () => {
    expect(isNavItemActive("/dashboard/123", "/dashboard")).toBe(false);
  });

  it("matches /history exactly", () => {
    expect(isNavItemActive("/history", "/history")).toBe(true);
  });

  it("matches /history/[id] as a prefix", () => {
    expect(isNavItemActive("/history/abc123", "/history")).toBe(true);
  });

  it("does not match /histories prefix confusion", () => {
    expect(isNavItemActive("/histories", "/history")).toBe(false);
  });

  it("matches /analytics exactly", () => {
    expect(isNavItemActive("/analytics", "/analytics")).toBe(true);
  });

  it("matches /records/[id] as a prefix", () => {
    expect(isNavItemActive("/records/pr-1", "/records")).toBe(true);
  });

  it("returns false for a completely different route", () => {
    expect(isNavItemActive("/coach", "/dashboard")).toBe(false);
  });
});

describe("NAV_ITEMS", () => {
  it("includes /injuries in NAV_ITEMS", () => {
    const item = NAV_ITEMS.find((i) => i.href === "/injuries");
    expect(item).toBeDefined();
    expect(item?.label).toBe("Injuries");
    expect(item?.gitCommand).toBe("$ git issue --list");
  });

  it("/injuries is positioned between /history and /coach", () => {
    const hrefs = NAV_ITEMS.map((i) => i.href);
    const historyIdx = hrefs.indexOf("/history");
    const injuriesIdx = hrefs.indexOf("/injuries");
    const coachIdx = hrefs.indexOf("/coach");
    expect(injuriesIdx).toBeGreaterThan(historyIdx);
    expect(injuriesIdx).toBeLessThan(coachIdx);
  });
});

describe("getPageMeta", () => {
  it("returns meta for exact routes", () => {
    expect(getPageMeta("/dashboard").title).toBe("Dashboard");
    expect(getPageMeta("/history").title).toBe("History");
  });

  it("returns meta for dynamic sub-routes", () => {
    expect(getPageMeta("/history/abc123").title).toBe("History");
    expect(getPageMeta("/log/new").title).toBe("Log Result");
  });

  it("falls back gracefully for unknown routes", () => {
    const meta = getPageMeta("/totally-unknown-route");
    expect(meta.title).toBe("FitHub");
    expect(meta.gitCommand).toBe("$ fithub");
  });
});
