"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { api } from "@/lib/api/client";
import type { CoachSession } from "@/lib/api";
import { SessionList } from "./SessionList";
import { SessionDrawer } from "./SessionDrawer";
import { ChatPanel } from "./ChatPanel";
import { CoachHeader } from "./CoachHeader";

interface CoachShellProps {
  token: string;
  userEmail: string;
  initialSessionId?: string;
}

export function CoachShell({
  token,
  userEmail,
  initialSessionId,
}: CoachShellProps) {
  const router = useRouter();
  const [activeSessionId, setActiveSessionId] = useState<string | null>(
    initialSessionId ?? null,
  );
  const [sessions, setSessions] = useState<CoachSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Silent refresh — called after session creation, no loading spinner
  const refreshSessions = useCallback(() => {
    api.coach.sessions
      .list(token, { limit: 20 })
      .then(setSessions)
      .catch(() => {});
  }, [token]);

  // Initial load — setState only inside async callbacks to satisfy lint rule
  useEffect(() => {
    api.coach.sessions
      .list(token, { limit: 20 })
      .then((data) => setSessions(data))
      .catch(() => {})
      .finally(() => setSessionsLoading(false));
  }, [token]);

  function handleSelectSession(id: string) {
    setActiveSessionId(id);
    router.push(`/coach/${id}`, { scroll: false });
  }

  function handleNewSession() {
    setActiveSessionId(null);
    router.push("/coach", { scroll: false });
  }

  function handleSessionCreated(id: string) {
    setActiveSessionId(id);
    router.replace(`/coach/${id}`, { scroll: false });
    refreshSessions();
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Desktop session list panel */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--background)] h-full">
        <div className="flex items-center justify-between px-3 py-3 border-b border-[var(--border)] shrink-0">
          <span className="font-mono text-xs text-[var(--muted-foreground)]">
            $ git coach --sessions
          </span>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden">
          <SessionList
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSelectSession={handleSelectSession}
            onNewSession={handleNewSession}
            isLoading={sessionsLoading}
          />
        </div>
      </aside>

      {/* Main chat area */}
      <div className="flex flex-1 flex-col min-w-0 h-full">
        {/* Coach identity header — always visible */}
        <CoachHeader />

        {/* Desktop session bar */}
        <div className="hidden md:flex items-center justify-between px-6 py-3 border-b border-[var(--border)] bg-[var(--background)] shrink-0">
          <p className="font-mono text-sm text-[var(--foreground)]">
            {activeSessionId
              ? sessions.find((s) => s.id === activeSessionId)?.title ?? "Coach"
              : "New session"}
          </p>
          <button
            onClick={handleNewSession}
            className="flex items-center gap-1.5 font-mono text-xs text-[var(--blue)] border border-[var(--border)] rounded-md px-3 py-1.5 hover:bg-[var(--card)] transition-colors"
          >
            <Plus size={12} aria-hidden />
            new session
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          <ChatPanel
            key={activeSessionId ?? "new"}
            token={token}
            sessionId={activeSessionId}
            userEmail={userEmail}
            onSessionCreated={handleSessionCreated}
          />
        </div>
      </div>

      {/* Mobile session drawer */}
      <SessionDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
        isLoading={sessionsLoading}
      />
    </div>
  );
}
