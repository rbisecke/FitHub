"use client";

import { useEffect } from "react";
import { cleanStaleShimmerKeys } from "@/lib/pr-celebrations";

// Runs once per authenticated session: cleans up stale localStorage entries
export function AppInit() {
  useEffect(() => {
    cleanStaleShimmerKeys();
  }, []);

  return null;
}
