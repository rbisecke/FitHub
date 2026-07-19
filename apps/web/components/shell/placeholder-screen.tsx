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

/**
 * Placeholder for the mixed-theme routes (`00` Part 2 / Part 4): `/plan`,
 * `/coach`, `/progress`, `/social`, `/admin` each host both dark and light
 * screens. The theme map is keyed per-screen, not per-route, so the `ForcedTheme`
 * wrapper must sit at the individual screen/sub-segment level — not the route
 * layout. This stacks one themed block per screen (split to fill the viewport) so
 * that per-sub-segment theming is demonstrated concretely now.
 */
export function MixedThemePlaceholder({
  title,
  screens,
}: {
  title: string;
  screens: ReadonlyArray<{
    theme: "light" | "dark";
    screen: string;
    note: string;
  }>;
}) {
  return (
    <div className="flex min-h-svh flex-col">
      {screens.map((s, i) => (
        <ForcedTheme key={s.screen} theme={s.theme} className="flex-1">
          <section className="flex h-full flex-col gap-1 bg-background p-6 text-foreground">
            {i === 0 ? <h1 className="type-h1">{title}</h1> : null}
            <span className="type-caption text-muted-foreground">
              {s.theme === "light" ? "Light" : "Dark"} · forced theme
            </span>
            <h2 className="type-h2">{s.screen}</h2>
            <p className="type-small text-muted-foreground">{s.note}</p>
          </section>
        </ForcedTheme>
      ))}
    </div>
  );
}
