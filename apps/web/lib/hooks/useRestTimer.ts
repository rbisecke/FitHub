"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const LS_KEY_ENABLED = "fithub:rest_timer_enabled";
const LS_KEY_DURATION = "fithub:rest_timer_duration";
const DEFAULT_DURATION = 90;

function readBool(key: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(key);
    if (v === null) return fallback;
    return v === "true";
  } catch {
    return fallback;
  }
}

function readInt(key: string, fallback: number): number {
  try {
    const v = localStorage.getItem(key);
    if (v === null) return fallback;
    const n = parseInt(v, 10);
    return isNaN(n) ? fallback : n;
  } catch {
    return fallback;
  }
}

export interface RestTimerApi {
  remaining: number;
  active: boolean;
  enabled: boolean;
  duration: number;
  start: (seconds?: number) => void;
  stop: () => void;
  setEnabled: (v: boolean) => void;
  setDuration: (v: number) => void;
}

export function useRestTimer(): RestTimerApi {
  const [enabled, setEnabledState] = useState<boolean>(() =>
    typeof window !== "undefined" ? readBool(LS_KEY_ENABLED, false) : false,
  );
  const [duration, setDurationState] = useState<number>(() =>
    typeof window !== "undefined"
      ? readInt(LS_KEY_DURATION, DEFAULT_DURATION)
      : DEFAULT_DURATION,
  );
  const [remaining, setRemaining] = useState(0);
  const [active, setActive] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Countdown interval
  useEffect(() => {
    if (!active) return;
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          setActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [active]);

  const start = useCallback(
    (seconds?: number) => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      const secs = seconds ?? duration;
      setRemaining(secs);
      setActive(true);
    },
    [duration],
  );

  const stop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setActive(false);
    setRemaining(0);
  }, []);

  const setEnabled = useCallback((v: boolean) => {
    setEnabledState(v);
    try {
      localStorage.setItem(LS_KEY_ENABLED, String(v));
    } catch {}
  }, []);

  const setDuration = useCallback((v: number) => {
    setDurationState(v);
    try {
      localStorage.setItem(LS_KEY_DURATION, String(v));
    } catch {}
  }, []);

  return {
    remaining,
    active,
    enabled,
    duration,
    start,
    stop,
    setEnabled,
    setDuration,
  };
}
