"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createApiClient } from "@/lib/api/client";
import type { CoachSession } from "@/lib/api";

const PAGE_SIZE = 20;

export interface UseCoachSessionsResult {
  sessions: CoachSession[];
  loading: boolean;
  error: boolean;
  /** Heuristic, not a real server flag — `GET /coach/sessions` has no `has_more`
   * field (unlike `SessionMessagesResponse`), so "more available" is inferred
   * from whether the last page came back full. */
  hasMore: boolean;
  loadMore: () => void;
  loadingMore: boolean;
  /** Re-fetch the first page — called after a turn settles so a session that
   * just got a new reply (bumping `updated_at` server-side) resurfaces at the
   * top, and so a brand-new session appears at all. */
  refresh: () => void;
  removeSession: (id: string) => void;
  prependNewSession: (session: CoachSession) => void;
}

export function useCoachSessions(accessToken: string): UseCoachSessionsResult {
  const [sessions, setSessions] = useState<CoachSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const knownIds = useRef(new Set<string>());
  const loadMoreControllerRef = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      loadMoreControllerRef.current?.abort();
    },
    [],
  );

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    const client = createApiClient(accessToken);

    // Deferred to a microtask — satisfies react-hooks/set-state-in-effect.
    void Promise.resolve().then(() => {
      if (!cancelled) {
        setLoading(true);
        setError(false);
      }
    });
    client.coach.sessions
      .list({ limit: PAGE_SIZE }, { signal: controller.signal })
      .then((data) => {
        if (cancelled) return;
        setSessions(data);
        knownIds.current = new Set(data.map((s) => s.id));
        setHasMore(data.length === PAGE_SIZE);
      })
      .catch(() => {
        if (cancelled || controller.signal.aborted) return;
        setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [accessToken, refreshKey]);

  const loadMore = useCallback(() => {
    if (loadingMore || sessions.length === 0) return;
    const lastId = sessions[sessions.length - 1]?.id;
    if (!lastId) return;
    setLoadingMore(true);
    const controller = new AbortController();
    loadMoreControllerRef.current = controller;
    const client = createApiClient(accessToken);
    client.coach.sessions
      .list(
        { limit: PAGE_SIZE, beforeId: lastId },
        { signal: controller.signal },
      )
      .then((data) => {
        if (controller.signal.aborted) return;
        const fresh = data.filter((s) => !knownIds.current.has(s.id));
        for (const s of fresh) knownIds.current.add(s.id);
        setSessions((prev) => [...prev, ...fresh]);
        setHasMore(data.length === PAGE_SIZE);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setError(true);
      })
      .finally(() => {
        if (controller.signal.aborted) return;
        setLoadingMore(false);
      });
  }, [accessToken, loadingMore, sessions]);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const removeSession = useCallback((id: string) => {
    knownIds.current.delete(id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const prependNewSession = useCallback((session: CoachSession) => {
    if (knownIds.current.has(session.id)) return;
    knownIds.current.add(session.id);
    setSessions((prev) => [session, ...prev]);
  }, []);

  return {
    sessions,
    loading,
    error,
    hasMore,
    loadMore,
    loadingMore,
    refresh,
    removeSession,
    prependNewSession,
  };
}
