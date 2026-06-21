import { defineConfig, devices } from "@playwright/test";

// Smoke tests run against the local dev server.
// Start Supabase first (`supabase start`) then run `pnpm e2e`.
export default defineConfig({
  testDir: "./e2e",
  // In live-LLM mode, Ollama is single-threaded — run tests sequentially
  // to avoid saturating the inference queue.
  fullyParallel: process.env.LIVE_LLM !== "true",
  workers: process.env.LIVE_LLM === "true" ? 1 : undefined,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Ollama LLM calls can take 60-120s; use a longer timeout in live-LLM mode
  timeout: process.env.LIVE_LLM === "true" ? 300_000 : 30_000,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
