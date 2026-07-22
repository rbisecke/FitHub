import { redirect } from "next/navigation";

/**
 * `/social` has no content of its own — the team-session list is the default
 * segment (design-spec 06 §F7: nav lands on the primary list, matching every
 * other domain's `/progress` → `/progress/records` precedent). Redirect
 * rather than duplicate the tab nav's default-active styling here.
 */
export default function SocialPage(): never {
  redirect("/social/team-sessions");
}
