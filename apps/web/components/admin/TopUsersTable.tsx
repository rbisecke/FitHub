import type { AdminUserCostRow } from "@/lib/api";

interface Props {
  users: AdminUserCostRow[];
}

function fmtCost(n: number): string {
  return `$${n.toFixed(4)}`;
}

export function TopUsersTable({ users }: Props) {
  const GRID = "28px minmax(0,2fr) 1fr 1fr";

  const rows = users.slice(0, 10);

  return (
    <div>
      {/* Table card header */}
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid #30363d",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div
            style={{
              fontWeight: 700,
              fontSize: 14,
              color: "#e6edf3",
              fontFamily: "var(--font-jetbrains-mono), monospace",
            }}
          >
            Most active users
          </div>
          <div
            style={{
              fontSize: 11.5,
              color: "#8b949e",
              marginTop: 2,
              fontFamily: "var(--font-jetbrains-mono), monospace",
            }}
          >
            By interactions · last 30 days
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div
          style={{
            padding: "44px",
            textAlign: "center",
            color: "#8b949e",
            fontSize: 13,
            fontFamily: "var(--font-jetbrains-mono), monospace",
          }}
        >
          No usage data yet.
        </div>
      ) : (
        <>
          {/* Desktop column headers */}
          <div className="hidden md:block">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: GRID,
                gap: 12,
                padding: "11px 20px",
                borderBottom: "1px solid #30363d",
                fontSize: 10.5,
                color: "#8b949e",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                fontFamily: "var(--font-jetbrains-mono), monospace",
              }}
            >
              <span>#</span>
              <span>User</span>
              <span style={{ textAlign: "right" }}>Sessions</span>
              <span style={{ textAlign: "right" }}>Cost</span>
            </div>
          </div>

          {rows.map((user, idx) => {
            const displayName =
              user.display_name ??
              user.email ??
              `user-${user.user_id.slice(0, 8)}`;
            return (
              <div key={user.user_id}>
                {/* Desktop row */}
                <div className="hidden md:block">
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: GRID,
                      gap: 12,
                      padding: "13px 20px",
                      borderBottom: "1px solid #30363d",
                      alignItems: "center",
                      fontSize: 13,
                      fontFamily: "var(--font-jetbrains-mono), monospace",
                    }}
                  >
                    <span style={{ color: "#8b949e", fontWeight: 700 }}>
                      {idx + 1}
                    </span>
                    <span
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        color: "#e6edf3",
                      }}
                    >
                      {displayName}
                    </span>
                    <span style={{ textAlign: "right", color: "#8b949e" }}>
                      {user.interactions_30d.toLocaleString()}
                    </span>
                    <span
                      style={{
                        textAlign: "right",
                        fontWeight: 700,
                        color: "#FFC83D",
                      }}
                    >
                      {fmtCost(user.cost_30d_usd)}
                    </span>
                  </div>
                </div>

                {/* Mobile card */}
                <div
                  className="md:hidden"
                  style={{
                    padding: "13px 20px",
                    borderBottom: "1px solid #30363d",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    fontFamily: "var(--font-jetbrains-mono), monospace",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      minWidth: 0,
                    }}
                  >
                    <span
                      style={{
                        color: "#8b949e",
                        fontWeight: 700,
                        fontSize: 12,
                        minWidth: 18,
                        flexShrink: 0,
                      }}
                    >
                      {idx + 1}
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        color: "#e6edf3",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {displayName}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ fontSize: 12, color: "#8b949e" }}>
                      {user.interactions_30d.toLocaleString()}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#FFC83D",
                      }}
                    >
                      {fmtCost(user.cost_30d_usd)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
