import { describe, it, expect } from "vitest";
import { parseTimeInput, timeTextToSeconds } from "../lib/time";

describe("parseTimeInput", () => {
  it("returns raw input when no digits present", () => {
    expect(parseTimeInput("")).toBe("");
  });

  it("formats pure seconds < 60 as 0:ss", () => {
    expect(parseTimeInput("45")).toBe("0:45");
  });

  it("converts pure seconds >= 60 to mm:ss", () => {
    expect(parseTimeInput("90")).toBe("1:30");
  });

  it("treats 3+ digits as MMSS — last 2 = secs, rest = mins", () => {
    expect(parseTimeInput("632")).toBe("6:32");
  });

  it("normalises an already-formatted time string", () => {
    expect(parseTimeInput("6:32")).toBe("6:32");
  });

  it("strips non-digit characters then parses", () => {
    expect(parseTimeInput("6m32s")).toBe("6:32");
  });
});

describe("timeTextToSeconds", () => {
  it("converts mm:ss to total seconds", () => {
    expect(timeTextToSeconds("6:32")).toBe(392);
  });

  it("converts 0:ss to total seconds", () => {
    expect(timeTextToSeconds("0:45")).toBe(45);
  });

  it("converts 1:30 to 90 seconds", () => {
    expect(timeTextToSeconds("1:30")).toBe(90);
  });

  it("returns null for empty string", () => {
    expect(timeTextToSeconds("")).toBeNull();
  });

  it("returns null for non-time strings", () => {
    expect(timeTextToSeconds("abc")).toBeNull();
  });
});
