import { identityColor, normalizeGuestName } from "@fithub/shared";
import { cn } from "@/lib/utils";

/**
 * Avatar monogram (0.31, 06 "Avatar content" note).
 *
 * The app has no photo/avatar-upload model anywhere, so every avatar is an initials
 * monogram: 1–2 letters on the person's deterministic identity-color circle (full
 * radius). Consumes the identity-color hash from @fithub/shared (0.30) — a member is
 * keyed by `user_id`, a guest by their normalized `guest_name`, so a given person
 * reads as the same color on every screen.
 *
 * Presentational (no client hooks) so it renders in Server Components. Monogram text
 * is white on all eight identity hues, each pre-checked for contrast (06 §F2).
 */

const SIZES = {
  sm: "size-6 text-[10px]",
  md: "size-8 text-xs",
  lg: "size-10 text-sm",
} as const;

export type AvatarSize = keyof typeof SIZES;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export function AvatarMonogram({
  name,
  seed,
  isGuest = false,
  size = "md",
  className,
}: {
  /** Display name the monogram initials are derived from. */
  name: string;
  /** Identity-color seed. Defaults to `name` (use `user_id` for members). */
  seed?: string;
  /** Guests render with a dashed ring and seed off the normalized name (06 §4). */
  isGuest?: boolean;
  size?: AvatarSize;
  className?: string;
}) {
  const key = seed ?? name;
  const { cssVar } = identityColor(isGuest ? normalizeGuestName(key) : key);

  return (
    <span
      data-slot="avatar-monogram"
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-medium text-white select-none",
        isGuest && "border border-dashed border-white/60",
        SIZES[size],
        className,
      )}
      style={{ backgroundColor: cssVar }}
    >
      {initials(name)}
    </span>
  );
}
