"use client";

import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

/**
 * Routes where "log a new workout" doesn't apply — an edit form already has its
 * own primary action (its own "Save changes" button) pinned near the same
 * bottom-right corner the FAB perches over on mobile, and a *new*-entry action
 * makes no sense while editing an existing one. Unlike `/admin/*` (which opts
 * out of the whole shell by living outside the `(shell)` route group,
 * `app/admin/layout.tsx`), these routes still need the tab bar for navigation —
 * only the FAB itself is out of place — so the suppression is scoped to just
 * this component instead of the shell chrome as a whole.
 */
const FAB_SUPPRESSED_ROUTES = [/^\/workouts\/[^/]+\/edit$/];

function isFabSuppressed(pathname: string): boolean {
  return FAB_SUPPRESSED_ROUTES.some((pattern) => pattern.test(pathname));
}

/**
 * Quick-log FAB (Effort 1, `00` Part 4 "Mobile FAB").
 *
 * The single most frequent action — log something now — stays one thumb-tap away
 * from anywhere in the app. It opens the Domain 01 quick-log entry point; that
 * surface is built in Effort 3, so this stubs the target with a bottom sheet.
 *
 * Rendered inset into the mobile bottom-tab bar (its parent positions it); it is
 * mobile-only, matching the tab bar it belongs to. Renders nothing on routes in
 * `FAB_SUPPRESSED_ROUTES` above.
 */
export function QuickLogFab({ className }: { className?: string }) {
  const pathname = usePathname();
  if (isFabSuppressed(pathname)) return null;

  return (
    <Sheet>
      <SheetTrigger
        aria-label="Quick log a workout"
        className={cn(
          "elevation-overlay flex size-14 items-center justify-center rounded-full",
          "bg-[var(--accent)] text-[var(--bg)]",
          "ring-4 ring-[var(--bg)] transition-transform duration-fast ease-standard",
          "active:scale-95",
          // Focus keeps the dark separating halo and ADDS a distinct accent
          // outline outside it, so focus reads as an addition (not the halo
          // vanishing into an accent-on-accent blob).
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]",
          className,
        )}
      >
        <Plus className="size-6" strokeWidth={2.5} aria-hidden="true" />
      </SheetTrigger>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>Quick log</SheetTitle>
          <SheetDescription>
            The quick-log entry point lands in Effort 3 (Domain 01). This FAB is
            wired and ready to open it.
          </SheetDescription>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  );
}
