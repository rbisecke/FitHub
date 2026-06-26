import { defineConfig, devices } from "@playwright/test";

// QA-mode config: video recording, full traces, slower interactions.
// Run with: pnpm qa
// Requires the full stack: supabase start + FastAPI + Next.js dev server
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  timeout: 60_000,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report/qa", open: "never" }],
    ["json", { outputFile: "playwright-report/qa/results.json" }],
  ],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on",
    video: "on",
    screenshot: "on",
    launchOptions: {
      // 150ms delay between actions — closer to real user speed,
      // also makes videos easier to follow.
      slowMo: 150,
    },
  },
  projects: [
    {
      name: "desktop-qa",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: "mobile-qa",
      use: { ...devices["iPhone 14"] },
    },
  ],
});
