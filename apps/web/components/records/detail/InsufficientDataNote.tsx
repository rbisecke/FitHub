/**
 * Shared "not enough data yet" note (design-spec 04 Screen 2 States: < 3
 * data points, or all points on the same day — both collapse the backend's
 * `current_e1rm_kg` to null, so hiding the trend/projection composition is
 * driven entirely by that one field, not a client-side point recount).
 */
export function InsufficientDataNote({ loggedCount }: { loggedCount: number }) {
  const remaining = Math.max(0, 3 - loggedCount);
  return (
    <p
      className="font-sans text-[13px]"
      style={{ color: "var(--muted-foreground)" }}
    >
      {remaining > 0
        ? `Log ${remaining} more set${
            remaining === 1 ? "" : "s"
          } to unlock your strength trend.`
        : "Log a set on another day to unlock your strength trend — a trend needs sets spread across more than one day."}
    </p>
  );
}
