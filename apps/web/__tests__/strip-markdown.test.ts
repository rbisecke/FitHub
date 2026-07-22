import { describe, it, expect } from "vitest";
import { stripMarkdownForAnnouncement } from "@/lib/coach/strip-markdown";

describe("stripMarkdownForAnnouncement", () => {
  it("strips bold and inline code markers", () => {
    expect(
      stripMarkdownForAnnouncement("Consider a **deload** this week."),
    ).toBe("Consider a deload this week.");
    expect(stripMarkdownForAnnouncement("Try `back squat` today.")).toBe(
      "Try back squat today.",
    );
  });

  it("strips bullet and numbered list markers", () => {
    expect(
      stripMarkdownForAnnouncement("- Rest\n- Hydrate\n1. Sleep well"),
    ).toBe("Rest Hydrate Sleep well");
  });

  it("leaves plain text untouched", () => {
    expect(
      stripMarkdownForAnnouncement("How's my training load trending?"),
    ).toBe("How's my training load trending?");
  });
});
