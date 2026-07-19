"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

/**
 * OS-preference theme provider (0.22, 09 §7).
 *
 * Drives ONLY the OS-preference-following majority of the app. Forced per-screen
 * themes are NOT handled here — they use a server-rendered `[data-theme]` wrapper at
 * the route-segment layout (see the ForcedTheme convention), so this provider's
 * `forcedTheme` prop is deliberately never used.
 *
 * `attribute="class"` toggles `.light` / `.dark` on <html> to match the token
 * cascade in globals.css; `enableSystem` follows OS preference; the caller sets
 * `suppressHydrationWarning` on <html> so the injected class doesn't trip React.
 */
export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      enableSystem
      defaultTheme="dark"
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
