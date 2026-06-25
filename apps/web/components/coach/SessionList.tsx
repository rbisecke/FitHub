"use client";

import { Plus } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { SessionListItem } from "./SessionListItem";
import type { CoachSession } from "@/lib/api";

interface SessionListProps {
  sessions: CoachSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
}

export function SessionList({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onLoadMore,
  hasMore = false,
  isLoading = false,
}: SessionListProps) {
  return (
    <nav aria-label="Coach sessions" className="flex flex-col h-full">
      <div className="px-2 py-2 shrink-0">
        <button
          onClick={onNewSession}
          className="w-full text-left font-mono text-xs text-[#58a6ff] border border-[#30363d] rounded-md px-3 py-2 hover:bg-[#161b22] transition-colors flex items-center gap-1.5"
        >
          <Plus size={12} aria-hidden />
          new session
        </button>
      </div>

      <ScrollArea className="flex-1 min-h-0 px-2">
        {isLoading ? (
          <div className="flex flex-col gap-2 py-1">
            {[...Array(5)].map((_, i) => (
              <Skeleton
                key={i}
                className="h-11 w-full rounded-md bg-[#161b22]"
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-0.5 py-1">
            {sessions.map((s) => (
              <SessionListItem
                key={s.id}
                id={s.id}
                title={s.title}
                createdAt={s.created_at}
                isActive={s.id === activeSessionId}
                onSelect={onSelectSession}
              />
            ))}
            {hasMore && (
              <button
                onClick={onLoadMore}
                className="w-full text-center font-mono text-xs text-[#8b949e] hover:text-[#e6edf3] py-2 transition-colors"
              >
                load more sessions
              </button>
            )}
            {sessions.length === 0 && !isLoading && (
              <p className="px-3 py-4 font-mono text-xs text-[#8b949e] text-center">
                no sessions yet
              </p>
            )}
          </div>
        )}
      </ScrollArea>
    </nav>
  );
}
