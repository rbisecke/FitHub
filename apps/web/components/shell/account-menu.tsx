"use client";

import Link from "next/link";
import { ChevronRight, LogOut } from "lucide-react";
import { toast } from "sonner";
import { AvatarMonogram } from "@/components/shared/avatar-monogram";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SECONDARY_NAV, navHref } from "./nav-items";
import { cn } from "@/lib/utils";

const PREVIEW_USER = "Preview User";

/**
 * Account / "more" menu (Effort 1, step 1.6; `00` Part 4, `08` §4).
 *
 * The profile-icon menu named in the spec, structured as three zones so
 * navigation, identity, and the privileged mode-switch never blur together:
 *   1. Overflow nav (mobile only — Social/Injuries/Integrations, which have no
 *      other entry point once the bottom bar is down to five primary tabs).
 *   2. Identity (Profile & settings).
 *   3. The **Admin console** switch, admin-only, visually set apart with its own
 *      divider and a trailing chevron so it reads as "leaves into a different
 *      shell," not an ordinary settings link. This is the switch INTO the
 *      operator console; the matching "Exit admin" switch OUT lives in the
 *      console shell itself (the `/admin` screen). Admin deliberately does NOT
 *      also appear as a peer sidebar/nav row (see `desktop-sidebar.tsx`) — one
 *      entry point, not two for the same destination.
 *
 * Sign-out is stubbed with a toast; the real flow arrives with auth in Effort 2.
 */
export function AccountMenu({
  isAdmin,
  showName = false,
  includeOverflowNav = false,
}: {
  isAdmin: boolean;
  showName?: boolean;
  /**
   * When true (mobile), the secondary areas that have no other entry point on a
   * primary-only bottom bar (Social/Injuries/Integrations) are listed here too.
   * On desktop they live in the sidebar, so the footer menu omits them.
   */
  includeOverflowNav?: boolean;
}) {
  const overflow = includeOverflowNav
    ? SECONDARY_NAV.filter(
        (item) => !item.adminGated && item.segment !== "profile",
      )
    : [];
  const profile = SECONDARY_NAV.find((item) => item.segment === "profile")!;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account and more"
        className={cn(
          "flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-md p-1 text-left",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
        )}
      >
        <AvatarMonogram name={PREVIEW_USER} size="sm" />
        {showName ? (
          <span className="type-small truncate text-foreground group-data-[collapsible=icon]:hidden">
            {PREVIEW_USER}
          </span>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Signed in as {PREVIEW_USER}</DropdownMenuLabel>
        </DropdownMenuGroup>
        {overflow.length > 0 ? (
          <>
            <DropdownMenuGroup>
              {overflow.map((item) => {
                const Icon = item.icon;
                return (
                  <DropdownMenuItem
                    key={item.segment}
                    render={
                      <Link href={navHref(item.segment)}>
                        <Icon aria-hidden="true" />
                        <span>{item.label}</span>
                      </Link>
                    }
                  />
                );
              })}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
          </>
        ) : null}
        <DropdownMenuGroup>
          <DropdownMenuItem
            render={
              <Link href={navHref(profile.segment)}>
                <profile.icon aria-hidden="true" />
                <span>Profile &amp; settings</span>
              </Link>
            }
          />
        </DropdownMenuGroup>
        {isAdmin ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                render={
                  <Link href={navHref("admin")}>
                    <span
                      aria-hidden="true"
                      className="size-2 shrink-0 rounded-full bg-[var(--amber)]"
                    />
                    <span className="flex-1">Admin console</span>
                    <ChevronRight
                      className="size-4 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </Link>
                }
              />
            </DropdownMenuGroup>
          </>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() =>
            toast("Sign out", {
              description: "The sign-out flow arrives with auth in Effort 2.",
            })
          }
        >
          <LogOut aria-hidden="true" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
