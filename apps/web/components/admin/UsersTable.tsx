"use client";

import { useState } from "react";
import type { AdminUser } from "@/lib/api";

// Avatar color cycles by first char code mod 4
const AVATAR_COLORS = ["#58a6ff", "#4ADE80", "#FFC83D", "#FF7A45"] as const;

function getAvatarColor(email: string | null, displayName: string | null) {
  const str = email ?? displayName ?? "?";
  return AVATAR_COLORS[str.charCodeAt(0) % 4];
}

function getInitials(email: string | null, displayName: string | null) {
  const name = displayName ?? email ?? "?";
  return name.slice(0, 2).toUpperCase();
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type SortKey = "created_at" | "interactions_30d";
type SortDir = "asc" | "desc";

// ── Sort button ───────────────────────────────────────────────────────────────

interface SortButtonProps {
  label: string;
  sortKey: SortKey;
  active: SortKey;
  dir: SortDir;
  onSort: (key: SortKey) => void;
}

function SortButton({ label, sortKey, active, dir, onSort }: SortButtonProps) {
  const isActive = active === sortKey;
  return (
    <button
      onClick={() => onSort(sortKey)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        background: "none",
        border: "none",
        cursor: "pointer",
        fontFamily: "var(--font-jetbrains-mono), monospace",
        fontSize: 10.5,
        textTransform: "uppercase",
        letterSpacing: ".5px",
        padding: 0,
        color: isActive ? "#e6edf3" : "#8b949e",
        transition: "color 150ms ease",
      }}
    >
      {label}
      {isActive && (
        <span style={{ fontSize: 11 }}>{dir === "desc" ? "↓" : "↑"}</span>
      )}
    </button>
  );
}

// ── Main table ────────────────────────────────────────────────────────────────

const GRID = "minmax(0,2fr) 1.1fr 1.3fr 1fr";

interface Props {
  users: AdminUser[];
}

export function UsersTable({ users }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const sorted = [...users].sort((a, b) => {
    let av: number;
    let bv: number;
    if (sortKey === "interactions_30d") {
      av = a.interactions_30d;
      bv = b.interactions_30d;
    } else {
      av = a.created_at ? new Date(a.created_at).getTime() : 0;
      bv = b.created_at ? new Date(b.created_at).getTime() : 0;
    }
    return sortDir === "desc" ? bv - av : av - bv;
  });

  return (
    <div
      style={{
        background: "#161b22",
        border: "1px solid #30363d",
        borderRadius: 16,
        overflow: "hidden",
      }}
    >
      {/* Table header */}
      <div
        style={{
          padding: "12px 20px",
          borderBottom: "1px solid #30363d",
          display: "grid",
          gridTemplateColumns: GRID,
          gap: 12,
          fontSize: 10.5,
          color: "#8b949e",
          textTransform: "uppercase",
          letterSpacing: ".5px",
          alignItems: "center",
        }}
      >
        <span>Email</span>
        <SortButton
          label="Joined"
          sortKey="created_at"
          active={sortKey}
          dir={sortDir}
          onSort={handleSort}
        />
        <span>Last Active</span>
        <SortButton
          label="Sessions (30d)"
          sortKey="interactions_30d"
          active={sortKey}
          dir={sortDir}
          onSort={handleSort}
        />
      </div>

      {/* Data rows */}
      {sorted.length === 0 ? (
        <div
          style={{
            padding: 44,
            textAlign: "center",
            color: "#8b949e",
            fontSize: 13,
          }}
        >
          No users found.
        </div>
      ) : (
        sorted.map((user) => {
          const avatarColor = getAvatarColor(user.email, user.display_name);
          const initials = getInitials(user.email, user.display_name);
          const label = user.display_name ?? user.email ?? user.user_id;
          return (
            <div
              key={user.user_id}
              style={{
                padding: "14px 20px",
                borderBottom: "1px solid #30363d",
                display: "grid",
                gridTemplateColumns: GRID,
                gap: 12,
                alignItems: "center",
                fontSize: 13,
              }}
            >
              {/* Email + avatar */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: avatarColor,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: 11,
                    color: "#0d1117",
                    flexShrink: 0,
                  }}
                >
                  {initials}
                </div>
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {label}
                </span>
              </div>

              {/* Joined */}
              <span style={{ color: "#8b949e" }}>
                {formatDate(user.created_at)}
              </span>

              {/* Last active — not returned by API */}
              <span style={{ color: "#8b949e" }}>—</span>

              {/* Sessions */}
              <span
                style={{
                  color: "#8b949e",
                  fontFamily: "var(--font-jetbrains-mono), monospace",
                }}
              >
                {user.interactions_30d.toLocaleString()}
              </span>
            </div>
          );
        })
      )}
    </div>
  );
}
