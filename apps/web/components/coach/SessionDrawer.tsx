"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SessionList } from "./SessionList";
import type { CoachSession } from "@/lib/api";

interface SessionDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessions: CoachSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  isLoading?: boolean;
}

export function SessionDrawer({
  open,
  onOpenChange,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  isLoading,
}: SessionDrawerProps) {
  function handleSelect(id: string) {
    onSelectSession(id);
    onOpenChange(false);
  }

  function handleNew() {
    onNewSession();
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[70vh] bg-[#0d1117] border-t border-[#30363d] p-0"
      >
        <SheetHeader className="px-4 py-3 border-b border-[#30363d]">
          <SheetTitle className="font-mono text-sm text-[#e6edf3]">
            $ git coach --sessions
          </SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-full">
          <SessionList
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSelectSession={handleSelect}
            onNewSession={handleNew}
            isLoading={isLoading}
          />
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
