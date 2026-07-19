import type { InjuryOut } from "@/lib/api/plans";

export type InjuryStatus = InjuryOut["status"];

/** A forward status transition offered from the detail sheet. */
export interface StatusTransition {
  to: "cleared_with_restrictions" | "permanent" | "resolved";
  label: string;
  /** True if choosing this transition should prompt for restriction notes first. */
  promptsRestrictionNotes: boolean;
}

/**
 * Allowed forward-only transitions per current status (05 §2.1). There is
 * deliberately NO path back to "active" from any state — once an injury is
 * cleared, made permanent, or resolved, the only way "back in" is a fresh
 * injury report. `resolved` is a terminal state with no further transitions.
 */
export function allowedTransitions(status: InjuryStatus): StatusTransition[] {
  switch (status) {
    case "active":
      return [
        {
          to: "cleared_with_restrictions",
          label: "Clear with restrictions",
          promptsRestrictionNotes: true,
        },
        {
          to: "permanent",
          label: "Mark permanent",
          promptsRestrictionNotes: false,
        },
        {
          to: "resolved",
          label: "Mark resolved",
          promptsRestrictionNotes: false,
        },
      ];
    case "cleared_with_restrictions":
      return [
        {
          to: "resolved",
          label: "Mark resolved",
          promptsRestrictionNotes: false,
        },
      ];
    case "permanent":
    case "resolved":
      return [];
    default:
      return [];
  }
}

/** Restriction notes stay editable in every non-resolved status. */
export function restrictionNotesEditable(status: InjuryStatus): boolean {
  return status !== "resolved";
}
