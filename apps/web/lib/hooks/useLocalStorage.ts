"use client";

import { useCallback, useSyncExternalStore } from "react";
import { ls } from "@/lib/local-storage";

function subscribe(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

export function useLocalStorage(
  key: string,
  defaultValue: string,
): [string, (value: string) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => ls.get(key) ?? defaultValue,
    () => defaultValue,
  );

  const setValue = useCallback(
    (newValue: string) => {
      ls.set(key, newValue);
      window.dispatchEvent(new StorageEvent("storage", { key }));
    },
    [key],
  );

  return [value, setValue];
}
