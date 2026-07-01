import { cn } from "@/lib/utils";

export function FitHubMark({
  size = 28,
  className,
  decorative = false,
}: {
  size?: number;
  className?: string;
  decorative?: boolean;
}) {
  const radius = Math.round((size / 24) * 9); // 9px at 24px base
  const iconSize = Math.round(size * (19 / 34)); // inner icon vs. container ratio

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: "var(--accent)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : "FitHub"}
      className={cn("shrink-0", className)}
    >
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#0A0D12"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {!decorative && <title>FitHub</title>}
        {/* Commit nodes */}
        <circle cx="6" cy="6" r="2.4" />
        <circle cx="6" cy="18" r="2.4" />
        <circle cx="18" cy="8" r="2.4" />
        {/* Main branch (vertical) */}
        <path d="M6 8.4v7.2" />
        {/* Feature branch (curve from tip down to main) */}
        <path d="M18 10.4c0 3.2-4.5 2.2-7.5 4.4" />
      </svg>
    </div>
  );
}
