/**
 * Standalone screenshot script — Phase 3b visual verification.
 *
 * Uses the same auth injection strategy as workout-tracker.spec.ts
 * (Buffer.from().toString("base64url") via addCookies) to ensure the
 * dashboard SSR data path sees a valid session.
 *
 * Run: pnpm exec playwright test e2e/take-screenshots.ts --reporter=list
 */

import { type Page, chromium } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const SUPABASE_URL = "http://127.0.0.1:54321";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const E2E_EMAIL = "e2e-workout@test.local";
const E2E_PASSWORD = "E2eTestFitHub!2026";
const API_URL = "http://127.0.0.1:8000";
const BASE_URL = "http://localhost:3000";
const SCREENSHOT_DIR = path.join(__dirname, "../../..", "screenshots");

async function loginAndSetSession(page: Page): Promise<string> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email: E2E_EMAIL, password: E2E_PASSWORD }),
  });
  if (!res.ok) throw new Error(`auth failed: ${res.status}`);

  const session = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_at: number;
    token_type: string;
    user: Record<string, unknown>;
  };

  const encoded =
    "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url");

  await page.context().addCookies([
    {
      name: "sb-localhost-auth-token",
      value: encoded,
      domain: "localhost",
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
    },
  ]);

  return session.access_token;
}

async function ensureSeededWorkouts(token: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/v1/workouts?limit=5`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = (await res.json()) as { total: number };
  if (data.total >= 3) {
    console.log(`  ✓ ${data.total} workouts already seeded`);
    return;
  }

  const workouts = [
    {
      title: "Fran",
      performed_at: "2026-06-15T00:00:00Z",
      session_type: "metcon",
      workout_format: "for_time",
      session_rpe: 9,
      duration_s: 300,
      notes: "21-15-9 thrusters + pull-ups",
      results: [{ result_type: "time", time_s: 287, order_index: 0 }],
    },
    {
      title: "Back Squat 5×5",
      performed_at: "2026-06-14T00:00:00Z",
      session_type: "strength",
      workout_format: "strength",
      session_rpe: 8,
      duration_s: 3600,
      results: [
        { result_type: "weight", load_kg: 120, reps: 5, order_index: 0 },
        { result_type: "weight", load_kg: 120, reps: 5, order_index: 1 },
        { result_type: "weight", load_kg: 120, reps: 5, order_index: 2 },
      ],
    },
    {
      title: "Murph",
      performed_at: "2026-06-13T00:00:00Z",
      session_type: "metcon",
      workout_format: "for_time",
      session_rpe: 10,
      duration_s: 4200,
      notes:
        "Hero WOD — 1 mile run, 100 pull-ups, 200 push-ups, 300 squats, 1 mile run",
      results: [{ result_type: "time", time_s: 4187, order_index: 0 }],
    },
    {
      title: "Snatch Skill Work",
      performed_at: "2026-06-12T00:00:00Z",
      session_type: "skill",
      workout_format: "benchmark",
      session_rpe: 6,
      duration_s: 2400,
      results: [
        { result_type: "weight", load_kg: 60, reps: 3, order_index: 0 },
      ],
    },
    {
      title: "Annie",
      performed_at: "2026-06-11T00:00:00Z",
      session_type: "metcon",
      workout_format: "for_time",
      session_rpe: 8,
      duration_s: 720,
      results: [{ result_type: "time", time_s: 718, order_index: 0 }],
    },
    {
      title: "Active Recovery",
      performed_at: "2026-06-10T00:00:00Z",
      session_type: "active_recovery",
      workout_format: "intervals",
      session_rpe: 3,
      duration_s: 1800,
    },
  ];

  for (const w of workouts) {
    await fetch(`${API_URL}/api/v1/workouts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(w),
    });
  }
  console.log(`  ✓ Seeded ${workouts.length} workouts`);
}

async function shot(page: Page, name: string): Promise<void> {
  const filepath = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: filepath, fullPage: false });
  console.log(`  📸 ${name}.png`);
}

async function main(): Promise<void> {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  console.log("→ Authenticating…");
  const token = await loginAndSetSession(page);

  console.log("→ Checking workout data…");
  await ensureSeededWorkouts(token);

  // 1. Login page (logged out context)
  console.log("→ Taking screenshots…");
  const loggedOutCtx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const loggedOutPage = await loggedOutCtx.newPage();
  await loggedOutPage.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
  await shot(loggedOutPage, "phase3b-01-login");
  await loggedOutCtx.close();

  // 2. Dashboard — wait for client-side contribution graph to hydrate
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle" });
  // Wait until at least one non-empty cell appears (indicates client hydration complete)
  await page
    .waitForFunction(
      () => {
        const cells = Array.from(
          document.querySelectorAll(
            '[aria-label="Training contribution graph"] > div > div',
          ),
        );
        return cells.some(function (c) {
          return !c.className.includes("bg-zinc-800");
        });
      },
      { timeout: 15000 },
    )
    .catch(() => {
      /* OK if no workouts yet */
    });
  await page.waitForTimeout(300);
  await shot(page, "phase3b-02-dashboard");

  // 3. History page
  await page.goto(`${BASE_URL}/history`, { waitUntil: "networkidle" });
  await shot(page, "phase3b-03-history");

  // 4. Workout detail — grab the first workout id from API
  const listRes = await fetch(`${API_URL}/api/v1/workouts?limit=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const listData = (await listRes.json()) as { items: Array<{ id: string }> };
  if (listData.items.length > 0) {
    const firstId = listData.items[0]!.id;
    await page.goto(`${BASE_URL}/history/${firstId}`, {
      waitUntil: "networkidle",
    });
    await shot(page, "phase3b-04-detail");
  }

  // 5. Log form collapsed
  await page.goto(`${BASE_URL}/log/new`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await shot(page, "phase3b-05-logform-collapsed");

  // 6. Log form expanded — click the progressive-disclosure toggle
  const clicked = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll("button")).find(
      (b) => b.textContent?.includes("More details"),
    );
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  if (!clicked)
    console.warn(
      "  ⚠ disclosure button not found — screenshot may be collapsed",
    );
  await page.waitForTimeout(400);
  await shot(page, "phase3b-06-logform-expanded");

  await browser.close();
  console.log(`\n✅ Screenshots saved to ${SCREENSHOT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
