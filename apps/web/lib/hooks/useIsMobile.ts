"use client";

import { useSyncExternalStore } from "react";

export function useIsMobile(breakpoint = 640) {
  return useSyncExternalStore(
    (callback) => {
      const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
      mq.addEventListener("change", callback);
      return () => mq.removeEventListener("change", callback);
    },
    () => window.matchMedia(`(max-width: ${breakpoint - 1}px)`).matches,
    () => false,
  );
}
