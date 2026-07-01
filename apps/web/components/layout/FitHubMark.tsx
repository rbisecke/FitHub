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
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn("shrink-0 text-[var(--accent)]", className)}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : "FitHub"}
    >
      {!decorative && <title>FitHub</title>}
      {/* Tile */}
      <rect x="0" y="0" width="24" height="24" rx="6" />
      {/* Git graph cut-out: main branch (vertical) + feature branch (curve) + 3 commit nodes */}
      <rect x="7" y="5.5" width="2" height="14" rx="1" fill="#0d1117" />
      <path
        d="M8 12 Q12 9.5 16 7"
        stroke="#0d1117"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="8" cy="19" r="2.3" fill="#0d1117" />
      <circle cx="8" cy="12" r="2.3" fill="#0d1117" />
      <circle cx="16" cy="7" r="2.3" fill="#0d1117" />
    </svg>
  );
}
