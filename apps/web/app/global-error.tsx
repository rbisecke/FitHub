"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          backgroundColor: "#0d1117",
          color: "#e6edf3",
          fontFamily: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
        }}
      >
        <div style={{ maxWidth: 480, width: "100%" }}>
          <div
            style={{
              border: "1px solid rgba(248,81,73,0.4)",
              borderRadius: 8,
              padding: "2rem",
            }}
          >
            <p style={{ color: "#8b949e", fontSize: 14, margin: "0 0 4px" }}>
              $ git push origin main
            </p>
            <p style={{ color: "#f85149", fontSize: 14, margin: "0 0 24px" }}>
              fatal: unable to push — catastrophic merge conflict
            </p>

            <h1 style={{ margin: "0 0 8px", fontSize: 22 }}>
              Catastrophic failure
            </h1>
            <p style={{ color: "#8b949e", fontSize: 14, margin: "0 0 24px" }}>
              The root layout crashed. This is a rare error — please refresh the
              page.
              {error.digest && (
                <span style={{ display: "block", marginTop: 8, fontSize: 12 }}>
                  Ref: {error.digest}
                </span>
              )}
            </p>

            <button
              onClick={reset}
              style={{
                padding: "8px 16px",
                fontSize: 13,
                fontFamily: "inherit",
                backgroundColor: "#238636",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              $ git reset --hard HEAD
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
