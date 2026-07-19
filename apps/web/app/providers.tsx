"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getQueryClient } from "@/lib/query/query-client";
import { ThemeProvider } from "@/components/shared/theme-provider";

/**
 * Root client providers (0.19, 0.22).
 *
 * A single thin client boundary. `children` is passed through as a prop, so Server
 * Components nested below stay server-rendered (09 §9) — this boundary does not pull
 * the whole app into the client bundle.
 *
 * - QueryClientProvider (0.19): client-side server-state + the RSC-hydration target
 *   (0.20). The client comes from the shared `getQueryClient` factory (one browser
 *   client; a fresh server client per request).
 * - ThemeProvider (0.22): OS-preference dark/light via next-themes (the shared wrapper
 *   sets `attribute="class"`, `enableSystem`, dark default). Per-screen FORCED themes
 *   use the `data-theme` wrapper (0.23, `ForcedTheme`), never next-themes' forcedTheme.
 *
 * Motion is intentionally NOT wrapped here: per 09 §5 the `motion` runtime is scoped
 * to the handful of client islands that need springs, via `MotionProvider`
 * (`components/shared/motion-provider.tsx`) — the rest of the tree stays motion-free.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider disableTransitionOnChange>
        <TooltipProvider>{children}</TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
