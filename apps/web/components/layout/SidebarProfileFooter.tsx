"use client";

import { useRouter } from "next/navigation";
import { LogOut, User } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarFooter } from "@/components/ui/sidebar";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

function initials(email: string): string {
  return email.slice(0, 2).toUpperCase();
}

interface Props {
  user: SupabaseUser;
}

export function SidebarProfileFooter({ user }: Props) {
  const router = useRouter();
  const avatarUrl = user.user_metadata?.avatar_url as string | undefined;
  const displayEmail = user.email ?? "";

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <SidebarFooter className="border-t border-[var(--border)] p-2">
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            "flex w-full items-center gap-2 rounded-md p-2 transition-colors",
            "hover:bg-sidebar-accent text-sidebar-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
            // Collapsed: center the avatar
            "group-data-[collapsible=icon]:justify-center",
            "group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:h-10",
            "group-data-[collapsible=icon]:p-0",
          )}
        >
          <Avatar className="h-8 w-8 rounded-md shrink-0">
            <AvatarImage src={avatarUrl} alt={displayEmail} />
            <AvatarFallback className="rounded-md bg-[var(--secondary)] text-[var(--text)] text-xs font-mono">
              {initials(displayEmail)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 text-left group-data-[collapsible=icon]:hidden">
            <p className="text-xs text-[var(--text)] truncate font-mono">
              {displayEmail}
            </p>
            <p className="text-[10px] text-[var(--muted)]">
              $ git config --user
            </p>
          </div>
        </DropdownMenuTrigger>

        <DropdownMenuContent side="top" align="start" className="w-56">
          <DropdownMenuItem onClick={() => router.push("/profile")}>
            <User className="h-4 w-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleSignOut}
            className="text-[var(--red)] focus:text-[var(--red)]"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarFooter>
  );
}
