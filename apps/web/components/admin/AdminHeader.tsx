"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const SECTION_LABELS: Record<string, string> = {
  "/admin": "metrics",
  "/admin/access": "access",
  "/admin/users": "users",
  "/admin/health": "health",
};

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function AdminHeader() {
  const pathname = usePathname();
  const section = SECTION_LABELS[pathname] ?? "admin";
  const [time, setTime] = useState(() => formatTime(new Date()));

  useEffect(() => {
    const id = setInterval(() => setTime(formatTime(new Date())), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <header
      style={{
        height: 60,
        borderBottom: "1px solid #30363d",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 28px",
        position: "sticky",
        top: 0,
        zIndex: 30,
        background: "#0d1117",
      }}
    >
      {/* Breadcrumb */}
      <div
        style={{
          fontSize: 13,
          color: "#8b949e",
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontFamily: "var(--font-jetbrains-mono), monospace",
        }}
      >
        <span style={{ color: "#4ADE80" }}>admin</span>
        <span>/</span>
        <span style={{ color: "#e6edf3" }}>{section}</span>
      </div>

      {/* Health indicator */}
      <div
        style={{
          fontSize: 11.5,
          color: "#8b949e",
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontFamily: "var(--font-jetbrains-mono), monospace",
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "#4ADE80",
            display: "inline-block",
          }}
        />
        API healthy · {time}
      </div>
    </header>
  );
}
