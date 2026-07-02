"use client";

import { useState, useTransition } from "react";
import type { AdminAccessRequest } from "@/lib/api";

// ── Status pill ───────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: AdminAccessRequest["status"] }) {
  const styles: Record<AdminAccessRequest["status"], React.CSSProperties> = {
    pending: {
      color: "#FFC83D",
      background: "rgba(255,200,61,.14)",
      border: "1px solid rgba(255,200,61,.35)",
    },
    approved: {
      color: "#4ADE80",
      background: "rgba(74,222,128,.12)",
      border: "1px solid rgba(74,222,128,.35)",
    },
    rejected: {
      color: "#f85149",
      background: "rgba(248,81,73,.14)",
      border: "1px solid rgba(248,81,73,.35)",
    },
  };

  return (
    <span
      style={{
        fontSize: 9.5,
        fontWeight: 700,
        letterSpacing: ".5px",
        textTransform: "uppercase",
        padding: "2px 8px",
        borderRadius: 20,
        ...styles[status],
      }}
    >
      {status}
    </span>
  );
}

// ── Checkmark SVG ─────────────────────────────────────────────────────────────

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#0d1117"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// ── Request card ──────────────────────────────────────────────────────────────

interface CardProps {
  request: AdminAccessRequest;
  token: string;
  onUpdate: (updated: AdminAccessRequest) => void;
}

function RequestCard({ request, token, onUpdate }: CardProps) {
  const [pending, startTransition] = useTransition();
  const [hoverApprove, setHoverApprove] = useState(false);
  const [hoverReject, setHoverReject] = useState(false);

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function handleAction(action: "approved" | "rejected") {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/v1/admin/access-requests/${request.id}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action, note: null }),
        });
        if (res.ok) {
          const updated: AdminAccessRequest = await res.json();
          onUpdate(updated);
        }
      } catch {
        // Silently fail — user can retry
      }
    });
  }

  return (
    <div
      style={{
        background: "#161b22",
        border: "1px solid #30363d",
        borderRadius: 14,
        padding: "17px 19px",
        opacity: pending ? 0.6 : 1,
        transition: "opacity 150ms ease",
      }}
    >
      <div
        className="ar-card-inner"
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        {/* Left: content */}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontWeight: 700, fontSize: 14 }}>
              {request.email}
            </span>
            {request.name && (
              <span style={{ fontSize: 12.5, color: "#8b949e" }}>
                ({request.name})
              </span>
            )}
            <StatusPill status={request.status} />
          </div>

          {request.motivation && (
            <p
              style={{
                fontSize: 12.5,
                color: "#8b949e",
                lineHeight: 1.6,
                margin: "9px 0 0",
              }}
            >
              &ldquo;{request.motivation}&rdquo;
            </p>
          )}

          <div style={{ fontSize: 11, color: "#8b949e", marginTop: 9 }}>
            Requested {formatDate(request.created_at)}
          </div>
        </div>

        {/* Right: actions or resolved label */}
        {request.status === "pending" ? (
          <div
            className="ar-actions"
            style={{ display: "flex", gap: 8, flexShrink: 0 }}
          >
            <button
              onClick={() => handleAction("rejected")}
              disabled={pending}
              onMouseEnter={() => setHoverReject(true)}
              onMouseLeave={() => setHoverReject(false)}
              style={{
                background: "#21262d",
                border: hoverReject ? "1px solid #f85149" : "1px solid #30363d",
                color: hoverReject ? "#f85149" : "#8b949e",
                fontWeight: 600,
                fontSize: 12.5,
                padding: "9px 15px",
                borderRadius: 9,
                cursor: pending ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                transition: "border-color 150ms ease, color 150ms ease",
              }}
            >
              Reject
            </button>
            <button
              onClick={() => handleAction("approved")}
              disabled={pending}
              onMouseEnter={() => setHoverApprove(true)}
              onMouseLeave={() => setHoverApprove(false)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                background: "#4ADE80",
                color: "#0d1117",
                border: "none",
                fontWeight: 700,
                fontSize: 12.5,
                padding: "9px 15px",
                borderRadius: 9,
                cursor: pending ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                filter: hoverApprove ? "brightness(1.08)" : undefined,
                transition: "filter 150ms ease",
              }}
            >
              <CheckIcon />
              Approve
            </button>
          </div>
        ) : (
          <div
            style={{
              fontSize: 11.5,
              color: "#8b949e",
              flexShrink: 0,
              whiteSpace: "nowrap",
            }}
          >
            {request.status === "approved" ? "✓ invite sent" : "— dismissed"}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

type Tab = "pending" | "approved" | "rejected";

interface Props {
  initial: AdminAccessRequest[];
  token: string;
}

export function AccessRequestsPanel({ initial, token }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("pending");
  const [requests, setRequests] = useState<AdminAccessRequest[]>(initial);

  const filtered = requests.filter((r) => r.status === activeTab);

  const counts: Record<Tab, number> = {
    pending: requests.filter((r) => r.status === "pending").length,
    approved: requests.filter((r) => r.status === "approved").length,
    rejected: requests.filter((r) => r.status === "rejected").length,
  };

  function handleUpdate(updated: AdminAccessRequest) {
    setRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    // After approving/rejecting a pending item, keep the user on pending tab
    // so they can see the queue update
  }

  const tabs: Tab[] = ["pending", "approved", "rejected"];

  return (
    <div>
      {/* Tab bar */}
      <div
        style={{
          display: "inline-flex",
          gap: 2,
          background: "#161b22",
          border: "1px solid #30363d",
          borderRadius: 10,
          padding: 3,
          marginBottom: 18,
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              fontFamily: "var(--font-jetbrains-mono), monospace",
              fontSize: 12.5,
              fontWeight: 700,
              padding: "8px 15px",
              borderRadius: 8,
              cursor: "pointer",
              border: "none",
              background: activeTab === tab ? "#4ADE80" : "transparent",
              color: activeTab === tab ? "#0d1117" : "#8b949e",
              transition: "background 150ms ease, color 150ms ease",
            }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}{" "}
            <span style={{ opacity: 0.7 }}>{counts[tab]}</span>
          </button>
        ))}
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div
          style={{
            background: "#161b22",
            border: "1px dashed #30363d",
            borderRadius: 14,
            padding: 44,
            textAlign: "center",
            color: "#8b949e",
            fontSize: 13,
          }}
        >
          No {activeTab} requests.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          {filtered.map((req) => (
            <RequestCard
              key={req.id}
              request={req}
              token={token}
              onUpdate={handleUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
