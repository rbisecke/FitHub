import { cn } from "@/lib/utils";

/**
 * FitHubMark — the FitHub brand mark: a GitHub-green app-tile with the letter
 * "F" carved into it. Self-contained (fixed carve colour) so it renders
 * identically as a sidebar logo, collapsed-rail glyph, and favicon at any size.
 *
 * The tile colour tracks the `--green` design token via `currentColor`; the
 * carved "F" uses the page-background hex so the tile reads as a clean cut-out
 * on any surface.
 */
export function FitHubMark({
  size = 28,
  className,
  decorative = false,
}: {
  /** Rendered width/height in px. */
  size?: number;
  className?: string;
  /**
   * When the mark sits next to the visible "FitHub" wordmark, set this true so
   * screen readers don't announce the brand name twice. Standalone (collapsed
   * rail, favicon) should stay `false` to expose the "FitHub" label.
   */
  decorative?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn("shrink-0 text-[var(--green)]", className)}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : "FitHub"}
    >
      {!decorative && <title>FitHub</title>}
      <rect x="0" y="0" width="24" height="24" rx="6" />
      <g fill="#0d1117">
        <rect x="7.5" y="5" width="3" height="14" rx="0.4" />
        <rect x="7.5" y="5" width="8.5" height="3" rx="0.4" />
        <rect x="7.5" y="10.6" width="6" height="2.8" rx="0.4" />
      </g>
    </svg>
  );
}
