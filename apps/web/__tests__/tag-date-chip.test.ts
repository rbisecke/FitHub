import { describe, it, expect } from "vitest";

// Replicate the helper from TagPageClient for isolated testing
function getTodayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDateChip(dateStr: string, todayStr: string): string {
  if (dateStr === todayStr) return "Today";
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

describe("formatDateChip", () => {
  const today = getTodayLocal();

  it("returns 'Today' for today's date", () => {
    expect(formatDateChip(today, today)).toBe("Today");
  });

  it("formats a past date as 'Mon D'", () => {
    const label = formatDateChip("2026-07-01", "2026-07-04");
    expect(label).toBe("Jul 1");
  });

  it("formats a date in a different month", () => {
    const label = formatDateChip("2026-06-15", "2026-07-04");
    expect(label).toBe("Jun 15");
  });
});
