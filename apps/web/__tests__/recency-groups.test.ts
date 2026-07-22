import { describe, it, expect } from "vitest";
import {
  bucketForDate,
  groupSessionsByRecency,
} from "@/lib/coach/recency-groups";

// Fixed "now" for deterministic bucketing — local midday on a Wednesday.
const NOW = new Date(2026, 6, 15, 12, 0, 0); // 2026-07-15 (month is 0-indexed)

describe("bucketForDate", () => {
  it("buckets same local day as Today", () => {
    expect(bucketForDate("2026-07-15T23:59:00Z", NOW)).toBe("Today");
    expect(bucketForDate("2026-07-15T00:00:01-07:00", NOW)).toBe("Today");
  });

  it("buckets the previous day as Yesterday", () => {
    expect(bucketForDate("2026-07-14T09:00:00Z", NOW)).toBe("Yesterday");
  });

  it("buckets 2-7 days ago as Previous 7 days", () => {
    expect(bucketForDate("2026-07-13T09:00:00Z", NOW)).toBe("Previous 7 days");
    expect(bucketForDate("2026-07-08T09:00:00Z", NOW)).toBe("Previous 7 days");
  });

  it("buckets more than 7 days ago as Older", () => {
    expect(bucketForDate("2026-07-01T09:00:00Z", NOW)).toBe("Older");
    expect(bucketForDate("2025-01-01T09:00:00Z", NOW)).toBe("Older");
  });
});

describe("groupSessionsByRecency", () => {
  it("groups and preserves server order within each bucket", () => {
    const sessions = [
      { id: "a", created_at: "2026-07-15T10:00:00Z" },
      { id: "b", created_at: "2026-07-15T08:00:00Z" },
      { id: "c", created_at: "2026-07-14T10:00:00Z" },
      { id: "d", created_at: "2026-06-01T10:00:00Z" },
    ];
    const groups = groupSessionsByRecency(sessions, NOW);
    expect(groups.map((g) => g.bucket)).toEqual([
      "Today",
      "Yesterday",
      "Older",
    ]);
    expect(groups[0]?.sessions.map((s) => s.id)).toEqual(["a", "b"]);
    expect(groups[1]?.sessions.map((s) => s.id)).toEqual(["c"]);
    expect(groups[2]?.sessions.map((s) => s.id)).toEqual(["d"]);
  });

  it("omits empty buckets entirely", () => {
    const sessions = [{ id: "a", created_at: "2026-07-15T10:00:00Z" }];
    const groups = groupSessionsByRecency(sessions, NOW);
    expect(groups).toEqual([{ bucket: "Today", sessions: sessions }]);
  });

  it("returns an empty array for no sessions", () => {
    expect(groupSessionsByRecency([], NOW)).toEqual([]);
  });
});
