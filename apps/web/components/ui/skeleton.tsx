import { cn } from "@/lib/utils";

/**
 * Canonical skeleton (0.10, 00 §3.8): a placeholder on the --surface ground with a
 * 1.2s shimmer (`.animate-skeleton`, defined in globals.css). The corner radius must
 * MATCH the content it replaces — pass a `rounded-*` class per the radius scale
 * (§3.5): `rounded-lg` (8px) for a card, `rounded-sm` (4px) for a chip, `rounded-full`
 * for an avatar. Defaults to 6px to match an input/button. Respects reduced motion
 * via the global CSS floor.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "animate-skeleton rounded-md bg-[var(--surface)]",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
