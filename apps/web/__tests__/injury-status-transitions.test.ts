import { describe, it, expect } from "vitest";
import {
  allowedTransitions,
  restrictionNotesEditable,
} from "../components/injuries/injuryStatusTransitions";

describe("allowedTransitions", () => {
  it("active can go to cleared_with_restrictions, permanent, or resolved", () => {
    const transitions = allowedTransitions("active").map((t) => t.to);
    expect(transitions).toEqual([
      "cleared_with_restrictions",
      "permanent",
      "resolved",
    ]);
  });

  it("cleared_with_restrictions can only go to resolved", () => {
    const transitions = allowedTransitions("cleared_with_restrictions").map(
      (t) => t.to,
    );
    expect(transitions).toEqual(["resolved"]);
  });

  it("permanent has no forward transitions", () => {
    expect(allowedTransitions("permanent")).toEqual([]);
  });

  it("resolved has no forward transitions", () => {
    expect(allowedTransitions("resolved")).toEqual([]);
  });

  it("never offers a transition back to active from any status", () => {
    for (const status of [
      "active",
      "cleared_with_restrictions",
      "permanent",
      "resolved",
    ] as const) {
      const targets = allowedTransitions(status).map((t) => t.to);
      expect(targets).not.toContain("active");
    }
  });

  it("only cleared_with_restrictions prompts for restriction notes", () => {
    const active = allowedTransitions("active");
    const clear = active.find((t) => t.to === "cleared_with_restrictions");
    const permanent = active.find((t) => t.to === "permanent");
    const resolved = active.find((t) => t.to === "resolved");
    expect(clear?.promptsRestrictionNotes).toBe(true);
    expect(permanent?.promptsRestrictionNotes).toBe(false);
    expect(resolved?.promptsRestrictionNotes).toBe(false);
  });
});

describe("restrictionNotesEditable", () => {
  it("is editable for active, cleared_with_restrictions, and permanent", () => {
    expect(restrictionNotesEditable("active")).toBe(true);
    expect(restrictionNotesEditable("cleared_with_restrictions")).toBe(true);
    expect(restrictionNotesEditable("permanent")).toBe(true);
  });

  it("is not editable once resolved", () => {
    expect(restrictionNotesEditable("resolved")).toBe(false);
  });
});
