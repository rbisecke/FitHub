"use client";

import { useEffect } from "react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App segment error:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full font-mono">
        <div className="border border-destructive/50 rounded-lg p-8 space-y-6">
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>$ git merge feature/this-page</p>
            <p className="text-destructive">
              CONFLICT: merge conflict in runtime
            </p>
            <p className="text-destructive">
              Automatic merge failed; fix conflicts and then commit the result.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">
              Merge conflict — something went wrong
            </h2>
            <p className="text-muted-foreground text-sm">
              An unexpected error occurred. You can try resetting, or go back to
              the dashboard.
            </p>
            {error.digest && (
              <p className="text-xs text-muted-foreground">
                Ref: {error.digest}
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={reset}
              className="px-4 py-2 text-sm font-mono bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
            >
              $ git reset --hard HEAD
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
