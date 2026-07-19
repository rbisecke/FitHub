// Deterministic per-person identity color (00 §3.3, 06 §F2, 09 §9).
//
// Maps a stable seed (a user_id, or a normalized guest_name for guests) to one of
// 8 fixed identity hues via `hash(seed) % 8`. Returns a TOKEN NAME/index, never a
// raw hex, so both light and dark themes resolve the color through CSS custom
// properties (`--identity-0` … `--identity-7`, defined in globals.css). The mapping
// is deterministic: a given person keeps the same color on every screen.

/** Number of identity hues in the palette (06 §F2). */
export const IDENTITY_COLOR_COUNT = 8;

/**
 * The 8 concrete hues, index-aligned with `--identity-0` … `--identity-7` in
 * globals.css. Exported for reference/testing; UI should consume the CSS var, not
 * these literals, so theme mapping stays in one place.
 */
export const IDENTITY_COLOR_HEXES: readonly string[] = [
  "#f0553d", // 0 red / orange-red
  "#ff8c42", // 1 warm orange
  "#ec4899", // 2 pink
  "#d267f0", // 3 magenta / orchid
  "#a371f7", // 4 purple / violet
  "#2dd4bf", // 5 teal
  "#3fb950", // 6 green
  "#a3e635", // 7 lime
] as const;

export interface IdentityColor {
  /** Palette index in [0, 8). */
  index: number;
  /** CSS custom-property name, e.g. `--identity-3`. */
  token: string;
  /** Ready-to-use `var(--identity-3)` reference for style attributes. */
  cssVar: string;
}

/**
 * FNV-1a 32-bit hash — small, fast, well-distributed, and deterministic across
 * environments (no reliance on any runtime-specific hashing). Returns an unsigned
 * 32-bit integer.
 */
export function hashString(input: string): number {
  let hash = 0x811c9dc5; // FNV offset basis
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    // 32-bit FNV prime multiply via shifts, kept in unsigned 32-bit space.
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Normalize a guest display name into a stable seed (trim + lowercase). */
export function normalizeGuestName(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Resolve a seed to its deterministic identity color. Pass a `user_id` for members,
 * or `normalizeGuestName(guest_name)` for guests.
 */
export function identityColor(seed: string): IdentityColor {
  const index = hashString(seed) % IDENTITY_COLOR_COUNT;
  const token = `--identity-${index}`;
  return { index, token, cssVar: `var(${token})` };
}
