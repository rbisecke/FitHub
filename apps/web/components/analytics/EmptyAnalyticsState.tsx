"use client";

import Link from "next/link";

export function EmptyAnalyticsState() {
  return (
    <div
      data-testid="empty-analytics-state"
      className="flex flex-col items-center justify-center gap-4 py-24 text-center"
    >
      <p className="font-mono text-sm text-zinc-500">
        Log at least 7 sessions with Load (AU) to see your training trends.
      </p>
      <Link
        href="/log/new"
        className="font-mono text-xs text-zinc-300 hover:text-zinc-100 underline"
      >
        git commit --fit
      </Link>
    </div>
  );
}
