import { ForcedTheme } from "@/components/shared/forced-theme";
import { AccessPaused } from "@/components/auth/access-paused";

/**
 * "Access paused" route (08 §1 "signed-in but not invited", step 2.4). Dark,
 * outside the app shell. Reached when a user has a valid session but is 403'd
 * from data routes because their email left the invite allowlist.
 */
export default function AccessPausedPage() {
  return (
    <ForcedTheme theme="dark">
      <AccessPaused />
    </ForcedTheme>
  );
}
