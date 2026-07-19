import type { ReactNode } from "react";
import { ForcedTheme } from "@/components/shared/forced-theme";

/**
 * Minimal placeholder screen for the Effort 1 nav shell.
 *
 * Effort 1 builds only the routing skeleton the nav links resolve to — the real
 * domain screens land in Efforts 2–10. Each placeholder just names its route and,
 * where a per-screen theme is assigned (`00` Part 2), demonstrates the forced-theme
 * mechanism via the Effort-0 `ForcedTheme` wrapper so the shell's theming is
 * verifiable now.
 *
 * `theme` is optional so the same component covers both single-theme routes (one
 * wrapper) and the mixed-theme routes, which compose several `ForcedTheme` blocks
 * at the sub-segment level rather than passing a single route-wide theme.
 */
export function PlaceholderScreen({
  title,
  subtitle,
  theme,
  children,
}: {
  title: string;
  subtitle?: string;
  theme?: "light" | "dark";
  children?: ReactNode;
}) {
  const body = (
    <div className="flex min-h-svh flex-col gap-2 bg-background p-6 text-foreground">
      <h1 className="type-h1">{title}</h1>
      {subtitle ? (
        <p className="type-small text-muted-foreground">{subtitle}</p>
      ) : null}
      {children}
    </div>
  );

  if (!theme) return body;
  return <ForcedTheme theme={theme}>{body}</ForcedTheme>;
}
