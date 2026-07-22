/**
 * The streak flame glyph (07 §F "Glyph asset sourcing"). A custom monochrome
 * SVG rather than an emoji — an emoji flame can't be recolored, and the
 * frost→flame recolor in the freeze-reveal's Beat 3 is load-bearing. Fill
 * uses `currentColor` so the parent controls color (and can transition it),
 * matching how the reveal animates frost-blue -> flame-orange.
 */
export function FlameGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 1.8c.4 3-.9 4.9-2.6 6.7-1.9 2-3.5 4-3.5 7A6.1 6.1 0 0 0 12 21.6a6.1 6.1 0 0 0 6.1-6.1c0-2.1-.9-3.6-2-5a5 5 0 0 1-2.3 3c.1-2.3-.9-3.6-2.1-5.1-1-1.3-1.9-2.6-1.7-4.6-.2.4-.5.7-1 1zm.3 8.2c.6.9 1 1.7 1 2.7a2.5 2.5 0 0 1-1.2 2.1 3.3 3.3 0 0 1-1-2.3c0-1 .5-1.7 1.2-2.5z" />
    </svg>
  );
}
