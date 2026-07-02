"use client";

function GitBranchIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="6" y1="3" x2="6" y2="15" />
      <circle cx="18" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M18 9a9 9 0 0 1-9 9" />
    </svg>
  );
}

export function AdminMobileBar() {
  return (
    <header
      className="md:hidden"
      style={{
        height: 46,
        background: "#161b22",
        borderBottom: "1px solid #30363d",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 18px",
        position: "sticky",
        top: 0,
        zIndex: 40,
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 7,
            background: "#4ADE80",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#0d1117",
          }}
        >
          <GitBranchIcon />
        </div>
        <span
          className="font-heading"
          style={{ fontSize: 15, letterSpacing: "-0.4px", color: "#e6edf3" }}
        >
          FitHub
        </span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            background: "rgba(255,200,61,.14)",
            border: "1px solid rgba(255,200,61,.3)",
            color: "#FFC83D",
            borderRadius: 4,
            padding: "2px 7px",
            textTransform: "uppercase" as const,
            letterSpacing: "0.5px",
            fontFamily: "var(--font-jetbrains-mono), monospace",
          }}
        >
          admin
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "#4ADE80",
            display: "inline-block",
          }}
        />
        <span
          style={{
            fontSize: 11,
            color: "#8b949e",
            fontFamily: "var(--font-jetbrains-mono), monospace",
          }}
        >
          healthy
        </span>
      </div>
    </header>
  );
}
