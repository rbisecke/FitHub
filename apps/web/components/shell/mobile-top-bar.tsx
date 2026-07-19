import { GitBranch } from "lucide-react";
import { AccountMenu } from "./account-menu";

/**
 * Mobile top bar (Effort 1, step 1.6).
 *
 * The mobile bottom bar holds only the primary five, so the secondary nav and the
 * admin role-switch live behind the account/"more" menu here. Brand on the left,
 * `AccountMenu` on the right. Mobile-only — the desktop shell uses the sidebar +
 * `ShellTopBar` instead.
 */
export function MobileTopBar({ isAdmin }: { isAdmin: boolean }) {
  return (
    <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur md:hidden">
      <div className="flex items-center gap-2">
        <GitBranch className="size-5 text-[var(--accent)]" aria-hidden="true" />
        <span className="type-h3">FitHub</span>
      </div>
      <AccountMenu isAdmin={isAdmin} includeOverflowNav />
    </header>
  );
}
