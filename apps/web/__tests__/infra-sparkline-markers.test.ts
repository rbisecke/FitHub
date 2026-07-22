import { describe, it, expect } from "vitest";
import { computeDeployMarkerX } from "../components/admin/infraSparklineMarkers";
import {
  deployStatusColor,
  isFailedDeployStatus,
} from "../components/admin/infraStatusColors";

describe("computeDeployMarkerX", () => {
  // A 1-hour sparkline window, matching the real Sparkline component's
  // min/max-of-collected_at scale.
  const minTime = new Date("2026-07-21T14:00:00Z").getTime();
  const maxTime = new Date("2026-07-21T15:00:00Z").getTime();
  const width = 100;

  it("places a deploy at the start of the window at x=0", () => {
    expect(
      computeDeployMarkerX("2026-07-21T14:00:00Z", minTime, maxTime, width),
    ).toBe(0);
  });

  it("places a deploy at the end of the window at x=width", () => {
    expect(
      computeDeployMarkerX("2026-07-21T15:00:00Z", minTime, maxTime, width),
    ).toBe(100);
  });

  it("places a deploy at the midpoint of the window at x=width/2", () => {
    expect(
      computeDeployMarkerX("2026-07-21T14:30:00Z", minTime, maxTime, width),
    ).toBe(50);
  });

  it("scales proportionally to elapsed time, not to point index", () => {
    // 15 minutes into a 60-minute window is 25% across, regardless of how
    // many history points fall before or after it.
    expect(
      computeDeployMarkerX("2026-07-21T14:15:00Z", minTime, maxTime, width),
    ).toBe(25);
  });

  it("returns null for a deploy before the visible window", () => {
    expect(
      computeDeployMarkerX("2026-07-21T13:00:00Z", minTime, maxTime, width),
    ).toBeNull();
  });

  it("returns null for a deploy after the visible window", () => {
    expect(
      computeDeployMarkerX("2026-07-21T16:00:00Z", minTime, maxTime, width),
    ).toBeNull();
  });

  it("returns null for an unparsable timestamp", () => {
    expect(
      computeDeployMarkerX("not-a-date", minTime, maxTime, width),
    ).toBeNull();
  });
});

describe("deployStatusColor", () => {
  it("maps known success statuses to green", () => {
    expect(deployStatusColor("READY")).toBe("var(--green)");
    expect(deployStatusColor("SUCCESS")).toBe("var(--green)");
  });

  it("maps known failure statuses to red", () => {
    expect(deployStatusColor("ERROR")).toBe("var(--red)");
    expect(deployStatusColor("CRASHED")).toBe("var(--red)");
    expect(deployStatusColor("FAILED")).toBe("var(--red)");
  });

  it("maps known in-progress statuses to amber", () => {
    expect(deployStatusColor("BUILDING")).toBe("var(--amber)");
    expect(deployStatusColor("QUEUED")).toBe("var(--amber)");
  });

  it("falls back to muted for an unrecognized free-text status, never guessing", () => {
    expect(deployStatusColor("WEIRD_NEW_PLATFORM_STATUS")).toBe("var(--muted)");
  });

  it("falls back to muted for a null status", () => {
    expect(deployStatusColor(null)).toBe("var(--muted)");
  });
});

describe("isFailedDeployStatus", () => {
  it("is true for the recognized failure statuses", () => {
    expect(isFailedDeployStatus("ERROR")).toBe(true);
    expect(isFailedDeployStatus("CRASHED")).toBe(true);
    expect(isFailedDeployStatus("FAILED")).toBe(true);
  });

  it("is false for success and in-progress statuses", () => {
    expect(isFailedDeployStatus("READY")).toBe(false);
    expect(isFailedDeployStatus("BUILDING")).toBe(false);
  });

  it("is false for an unrecognized status — unknown never escalates to failed", () => {
    expect(isFailedDeployStatus("SOMETHING_ELSE")).toBe(false);
  });

  it("is false for null", () => {
    expect(isFailedDeployStatus(null)).toBe(false);
  });
});
