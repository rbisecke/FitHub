import Link from "next/link";

const HUBS = [
  {
    href: "/plans",
    label: "Plans",
    sub: "active branches",
    iconColor: "var(--accent)",
    icon: (
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
        <circle cx="6" cy="6" r="2.4" />
        <circle cx="6" cy="18" r="2.4" />
        <circle cx="18" cy="8" r="2.4" />
        <path d="M6 8.4v7.2M18 10.4c0 4-6 3-6 7" />
      </svg>
    ),
  },
  {
    href: "/analytics",
    label: "Analytics",
    sub: "load & form",
    iconColor: "var(--blue)",
    icon: (
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
        <path d="M3 3v18h18" />
        <path d="M7 14l3-3 3 3 5-6" />
      </svg>
    ),
  },
  {
    href: "/records",
    label: "Records",
    sub: "personal bests",
    iconColor: "var(--gold)",
    icon: (
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
        <path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 01-10 0zM7 5H4v2a3 3 0 003 3M17 5h3v2a3 3 0 01-3 3" />
      </svg>
    ),
  },
  {
    href: "/history",
    label: "History",
    sub: "full commit log",
    iconColor: "var(--muted)",
    icon: (
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
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    ),
  },
];

export function HubGrid() {
  return (
    <div className="md:hidden grid grid-cols-2 gap-[10px] mb-[14px]">
      {HUBS.map((h) => (
        <Link
          key={h.href}
          href={h.href}
          className="flex flex-col items-start gap-[6px] bg-[var(--card)] border border-[var(--border)] rounded-[13px] p-[14px] font-data font-bold text-[13px] min-h-[44px] hover:border-[var(--accent)] transition-colors"
          style={{ color: "var(--foreground)" }}
        >
          <span style={{ color: h.iconColor }}>{h.icon}</span>
          <span>{h.label}</span>
          <span className="font-data text-[10px] font-normal text-[var(--muted)]">
            {h.sub}
          </span>
        </Link>
      ))}
    </div>
  );
}
