import { redirect } from "next/navigation";

/**
 * `/progress` has no content of its own — Records is the default segment
 * (design-spec 04 "Navigation" table lists it first). Redirect rather than
 * duplicate the tab nav's default-active styling here.
 */
export default function ProgressPage(): never {
  redirect("/progress/records");
}
