"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
  command: string;
  icon: React.ReactNode;
  badge?: { count: number; variant: "gold" | "red" };
}

const GitIcon = () => (
  <svg
    width="19"
    height="19"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#0d1117"
    strokeWidth="2.4"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="18" cy="18" r="3" />
    <circle cx="6" cy="6" r="3" />
    <circle cx="6" cy="18" r="3" />
    <line x1="6" y1="9" x2="6" y2="15" />
    <path d="M18 15V9a3 3 0 0 0-3-3H9" />
  </svg>
);

const MetricsIcon = () => (
  <svg
    width="17"
    height="17"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);

const AccessIcon = () => (
  <svg
    width="17"
    height="17"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="8" r="4" />
    <path d="M6 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
    <line x1="19" y1="8" x2="23" y2="8" />
    <line x1="21" y1="6" x2="21" y2="10" />
  </svg>
);

const UsersIcon = () => (
  <svg
    width="17"
    height="17"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const HealthIcon = () => (
  <svg
    width="17"
    height="17"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

interface Props {
  email: string;
  initials: string;
}

export function AdminSidebar({ email, initials }: Props) {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    {
      href: "/admin",
      label: "Metrics",
      command: "metrics --window 30d",
      icon: <MetricsIcon />,
    },
    {
      href: "/admin/access",
      label: "Access",
      command: "access --list pending",
      icon: <AccessIcon />,
    },
    {
      href: "/admin/users",
      label: "Users",
      command: "users --all",
      icon: <UsersIcon />,
    },
    {
      href: "/admin/health",
      label: "Health",
      command: "logs --level error",
      icon: <HealthIcon />,
    },
  ];

  return (
    <aside
      style={{
        width: 244,
        flexShrink: 0,
        borderRight: "1px solid #30363d",
        padding: "22px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 24,
        position: "sticky",
        top: 0,
        height: "100vh",
        background: "#0d1117",
      }}
    >
      {/* Logo row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 11,
          padding: "0 6px",
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 9,
            background: "#4ADE80",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <GitIcon />
        </div>
        <div>
          <div
            style={{
              fontFamily: "var(--font-archivo-black), sans-serif",
              fontSize: 17,
              letterSpacing: "-0.5px",
              lineHeight: 1,
              color: "#e6edf3",
            }}
          >
            FitHub
          </div>
          <div
            style={{
              fontSize: 10,
              color: "#8b949e",
              marginTop: 3,
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 2,
                background: "#FFC83D",
                display: "inline-block",
              }}
            />
            admin
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 11,
                width: "100%",
                textAlign: "left",
                fontFamily: "var(--font-jetbrains-mono), monospace",
                fontSize: 13,
                fontWeight: 600,
                padding: "10px 12px",
                borderRadius: 10,
                cursor: "pointer",
                border: isActive
                  ? "1px solid rgba(74,222,128,.3)"
                  : "1px solid transparent",
                background: isActive ? "rgba(74,222,128,.12)" : "transparent",
                color: isActive ? "#4ADE80" : "#8b949e",
                textDecoration: "none",
                transition:
                  "border-color 150ms ease, color 150ms ease, background 150ms ease",
              }}
            >
              {item.icon}
              {item.label}
              {item.badge && (
                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: 10,
                    fontWeight: 700,
                    background:
                      item.badge.variant === "gold"
                        ? "rgba(255,200,61,.16)"
                        : "rgba(248,81,73,.16)",
                    color:
                      item.badge.variant === "gold" ? "#FFC83D" : "#f85149",
                    border:
                      item.badge.variant === "gold"
                        ? "1px solid rgba(255,200,61,.35)"
                        : "1px solid rgba(248,81,73,.35)",
                    padding: "1px 7px",
                    borderRadius: 20,
                  }}
                >
                  {item.badge.count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User card */}
      <div
        style={{
          marginTop: "auto",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: 12,
          background: "#161b22",
          border: "1px solid #30363d",
          borderRadius: 12,
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            background: "#58a6ff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            fontSize: 13,
            color: "#0d1117",
            flexShrink: 0,
          }}
        >
          {initials}
        </div>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              color: "#e6edf3",
            }}
          >
            {email}
          </div>
          <div style={{ fontSize: 10, color: "#8b949e" }}>
            superuser · scoped
          </div>
        </div>
      </div>
    </aside>
  );
}
