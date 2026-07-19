"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

function getSnapshot(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(QUERY).matches;
}

/** Server snapshot: assume motion is allowed until the client reconciles. */
function getServerSnapshot(): boolean {
  return false;
}

/**
 * Canonical reduced-motion hook (0.8, 09 §5).
 *
 * The global CSS `@media (prefers-reduced-motion: reduce)` override in globals.css
 * is the safety net that collapses every transition/animation to ~instant. This hook
 * is the second layer: it gates the JS/spring islands specifically — skip mounting a
 * shard burst, render a counter's final value directly, etc.
 *
 * Uses `useSyncExternalStore` so the value is read straight from the media query with
 * no sync-setState-in-effect, and stays SSR-safe (returns `false` on the server).
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
