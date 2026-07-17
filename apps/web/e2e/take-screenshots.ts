/**
 * README screenshot script.
 *
 * Creates (or reuses) a "John Smith" demo user and takes the full set of
 * screenshots used in the root README.
 *
 * Prerequisites (must be running):
 *   - supabase start
 *   - alembic upgrade head
 *   - FastAPI on http://127.0.0.1:8000
 *   - Next.js dev server on http://localhost:3000
 *
 * Run:
 *   pnpm -C apps/web exec ts-node --project tsconfig.json -e "$(cat e2e/take-screenshots.ts)"
 *   — or via the playwright runner:
 *   pnpm exec playwright test e2e/take-screenshots.ts --reporter=list
 */

import { type Page, chromium } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const SUPABASE_URL = "http://127.0.0.1:54321";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

const DEMO_EMAIL = "john.smith@fithub.local";
const DEMO_PASSWORD = "DemoFitHub!2026";
const DEMO_DISPLAY_NAME = "John Smith";

const API_URL = "http://127.0.0.1:8000";
const BASE_URL = "http://localhost:3000";
const SCREENSHOT_DIR = path.join(
  __dirname,
  "../../..",
  "screenshots",
  "readme",
);

// ── Auth helpers ──────────────────────────────────────────────────────────────

async function ensureDemoUser(): Promise<string> {
  // Add to invite allowlist (idempotent).
  await fetch(`${SUPABASE_URL}/rest/v1/invited_emails`, {
    method: "POST",
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=ignore-duplicates",
    },
    body: JSON.stringify({ email: DEMO_EMAIL }),
  });

  // Create the user (422 = already exists — fine).
  await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
    }),
  });

  return getToken();
}

async function getToken(): Promise<string> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email: DEMO_EMAIL, password: DEMO_PASSWORD }),
  });
  if (!res.ok) throw new Error(`password grant failed: ${res.status}`);
  const session = (await res.json()) as { access_token: string };
  return session.access_token;
}

async function loginAndSetSession(page: Page, _token: string): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email: DEMO_EMAIL, password: DEMO_PASSWORD }),
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
}

// ── Data seeding ──────────────────────────────────────────────────────────────

async function ensureDemoPlan(token: string): Promise<void> {
  // Check if a plan already exists.
  const listRes = await fetch(`${API_URL}/api/v1/plans`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (listRes.ok) {
    const plans = (await listRes.json()) as Array<{ id: string }>;
    if (plans.length > 0) {
      console.log(`  ✓ Plan already exists (${plans[0]!.id})`);
      return;
    }
  }

  // POST to generate a new plan (202 async).
  const today = new Date();
  const startDate = `${today.getFullYear()}-${String(
    today.getMonth() + 1,
  ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const createRes = await fetch(`${API_URL}/api/v1/plans`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      archetype: "general-crossfit",
      title: "General CrossFit — 8 Weeks",
      start_date: startDate,
      weeks: 8,
      training_age: "intermediate",
      equipment: ["barbell", "pull-up bar", "kettlebell"],
      days_per_week: 4,
    }),
  });

  if (!createRes.ok) {
    console.warn(
      `  ⚠ Plan create returned ${createRes.status} — skipping plan screenshots`,
    );
    return;
  }

  const taskData = (await createRes.json()) as {
    task_id: string;
    status: string;
  };
  console.log(`  → Plan task created: ${taskData.task_id}`);

  // Poll until complete or timeout (30s).
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 1500));
    const pollRes = await fetch(
      `${API_URL}/api/v1/plans/tasks/${taskData.task_id}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    if (!pollRes.ok) continue;
    const poll = (await pollRes.json()) as { status: string; plan_id?: string };
    if (poll.status === "complete") {
      console.log(`  ✓ Plan generated (plan_id=${poll.plan_id})`);
      return;
    }
    if (poll.status === "failed") {
      console.warn(`  ⚠ Plan generation failed — skipping plan screenshots`);
      return;
    }
  }
  console.warn(
    `  ⚠ Plan generation timed out — plan screenshots may be empty`,
  );
}

async function ensureProfile(token: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/v1/profile`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      display_name: DEMO_DISPLAY_NAME,
      weight_unit: "kg",
      onboarding_completed: true,
    }),
  });
  if (res.ok) {
    console.log(`  ✓ Profile set to "${DEMO_DISPLAY_NAME}"`);
  } else {
    console.warn(`  ⚠ Profile patch returned ${res.status}`);
  }
}

async function ensureSeededWorkouts(token: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/v1/workouts?limit=5`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = (await res.json()) as {
    items: unknown[];
    next_cursor: string | null;
  };
  if (data.items.length >= 10) {
    console.log(`  ✓ ${data.items.length}+ workouts already seeded`);
    return;
  }

  // Build a realistic 10-week training history to populate analytics + contribution graph.
  const now = new Date("2026-07-06T00:00:00Z");
  const dayMs = 86400 * 1000;

  const workouts = [
    // Week 10 (most recent)
    {
      title: "Fran",
      performed_at: new Date(now.getTime() - 1 * dayMs).toISOString(),
      session_type: "metcon",
      workout_format: "for_time",
      session_rpe: 9,
      duration_s: 300,
      notes: "21-15-9 thrusters + pull-ups",
      results: [{ result_type: "time", time_s: 287, order_index: 0 }],
    },
    {
      title: "Back Squat 5×5",
      performed_at: new Date(now.getTime() - 2 * dayMs).toISOString(),
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
      performed_at: new Date(now.getTime() - 4 * dayMs).toISOString(),
      session_type: "metcon",
      workout_format: "for_time",
      session_rpe: 10,
      duration_s: 4200,
      notes:
        "Hero WOD — 1 mile run, 100 pull-ups, 200 push-ups, 300 squats, 1 mile run",
      results: [{ result_type: "time", time_s: 4187, order_index: 0 }],
    },
    // Week 9
    {
      title: "Snatch Skill Work",
      performed_at: new Date(now.getTime() - 7 * dayMs).toISOString(),
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
      performed_at: new Date(now.getTime() - 9 * dayMs).toISOString(),
      session_type: "metcon",
      workout_format: "for_time",
      session_rpe: 8,
      duration_s: 720,
      results: [{ result_type: "time", time_s: 718, order_index: 0 }],
    },
    {
      title: "Deadlift 3×3",
      performed_at: new Date(now.getTime() - 11 * dayMs).toISOString(),
      session_type: "strength",
      workout_format: "strength",
      session_rpe: 8,
      duration_s: 3000,
      results: [
        { result_type: "weight", load_kg: 160, reps: 3, order_index: 0 },
        { result_type: "weight", load_kg: 160, reps: 3, order_index: 1 },
        { result_type: "weight", load_kg: 160, reps: 3, order_index: 2 },
      ],
    },
    // Week 8
    {
      title: "Helen",
      performed_at: new Date(now.getTime() - 14 * dayMs).toISOString(),
      session_type: "metcon",
      workout_format: "for_time",
      session_rpe: 8,
      duration_s: 780,
      notes: "3 rounds: 400m run, 21 KB swings, 12 pull-ups",
      results: [{ result_type: "time", time_s: 768, order_index: 0 }],
    },
    {
      title: "Active Recovery",
      performed_at: new Date(now.getTime() - 15 * dayMs).toISOString(),
      session_type: "active_recovery",
      workout_format: "intervals",
      session_rpe: 3,
      duration_s: 1800,
    },
    {
      title: "Strict Press 5×5",
      performed_at: new Date(now.getTime() - 16 * dayMs).toISOString(),
      session_type: "strength",
      workout_format: "strength",
      session_rpe: 7,
      duration_s: 2700,
      results: [
        { result_type: "weight", load_kg: 60, reps: 5, order_index: 0 },
        { result_type: "weight", load_kg: 60, reps: 5, order_index: 1 },
        { result_type: "weight", load_kg: 60, reps: 5, order_index: 2 },
      ],
    },
    // Week 7
    {
      title: "Grace",
      performed_at: new Date(now.getTime() - 21 * dayMs).toISOString(),
      session_type: "metcon",
      workout_format: "for_time",
      session_rpe: 9,
      duration_s: 120,
      notes: "30 clean and jerks for time at 60kg",
      results: [{ result_type: "time", time_s: 118, order_index: 0 }],
    },
    {
      title: "Back Squat 3×3",
      performed_at: new Date(now.getTime() - 23 * dayMs).toISOString(),
      session_type: "strength",
      workout_format: "strength",
      session_rpe: 9,
      duration_s: 3600,
      results: [
        { result_type: "weight", load_kg: 130, reps: 3, order_index: 0 },
        { result_type: "weight", load_kg: 130, reps: 3, order_index: 1 },
        { result_type: "weight", load_kg: 130, reps: 3, order_index: 2 },
      ],
    },
    // Week 6
    {
      title: "Isabel",
      performed_at: new Date(now.getTime() - 28 * dayMs).toISOString(),
      session_type: "metcon",
      workout_format: "for_time",
      session_rpe: 9,
      duration_s: 180,
      notes: "30 snatches for time at 60kg",
      results: [{ result_type: "time", time_s: 174, order_index: 0 }],
    },
    {
      title: "Active Recovery",
      performed_at: new Date(now.getTime() - 29 * dayMs).toISOString(),
      session_type: "active_recovery",
      workout_format: "intervals",
      session_rpe: 3,
      duration_s: 2400,
    },
    {
      title: "Bench Press 5×5",
      performed_at: new Date(now.getTime() - 31 * dayMs).toISOString(),
      session_type: "strength",
      workout_format: "strength",
      session_rpe: 8,
      duration_s: 3000,
      results: [
        { result_type: "weight", load_kg: 90, reps: 5, order_index: 0 },
        { result_type: "weight", load_kg: 90, reps: 5, order_index: 1 },
        { result_type: "weight", load_kg: 90, reps: 5, order_index: 2 },
      ],
    },
    // Week 5
    {
      title: "Karen",
      performed_at: new Date(now.getTime() - 35 * dayMs).toISOString(),
      session_type: "metcon",
      workout_format: "for_time",
      session_rpe: 8,
      duration_s: 600,
      notes: "150 wall balls for time at 9kg",
      results: [{ result_type: "time", time_s: 592, order_index: 0 }],
    },
    {
      title: "Deadlift 5×5",
      performed_at: new Date(now.getTime() - 37 * dayMs).toISOString(),
      session_type: "strength",
      workout_format: "strength",
      session_rpe: 8,
      duration_s: 3600,
      results: [
        { result_type: "weight", load_kg: 150, reps: 5, order_index: 0 },
        { result_type: "weight", load_kg: 150, reps: 5, order_index: 1 },
        { result_type: "weight", load_kg: 150, reps: 5, order_index: 2 },
      ],
    },
    // Week 4
    {
      title: "Cindy",
      performed_at: new Date(now.getTime() - 42 * dayMs).toISOString(),
      session_type: "metcon",
      workout_format: "amrap",
      session_rpe: 7,
      duration_s: 1200,
      notes: "AMRAP 20: 5 pull-ups, 10 push-ups, 15 air squats",
      results: [{ result_type: "reps", reps: 22, order_index: 0 }],
    },
    {
      title: "Back Squat 5×5",
      performed_at: new Date(now.getTime() - 44 * dayMs).toISOString(),
      session_type: "strength",
      workout_format: "strength",
      session_rpe: 8,
      duration_s: 3600,
      results: [
        { result_type: "weight", load_kg: 115, reps: 5, order_index: 0 },
        { result_type: "weight", load_kg: 115, reps: 5, order_index: 1 },
        { result_type: "weight", load_kg: 115, reps: 5, order_index: 2 },
      ],
    },
    {
      title: "Active Recovery",
      performed_at: new Date(now.getTime() - 45 * dayMs).toISOString(),
      session_type: "active_recovery",
      workout_format: "intervals",
      session_rpe: 3,
      duration_s: 1800,
    },
    // Week 3
    {
      title: "Nancy",
      performed_at: new Date(now.getTime() - 49 * dayMs).toISOString(),
      session_type: "metcon",
      workout_format: "for_time",
      session_rpe: 8,
      duration_s: 1080,
      notes: "5 rounds: 400m run, 15 overhead squats at 43kg",
      results: [{ result_type: "time", time_s: 1062, order_index: 0 }],
    },
    {
      title: "Deadlift 3×3",
      performed_at: new Date(now.getTime() - 51 * dayMs).toISOString(),
      session_type: "strength",
      workout_format: "strength",
      session_rpe: 9,
      duration_s: 3000,
      results: [
        { result_type: "weight", load_kg: 165, reps: 3, order_index: 0 },
        { result_type: "weight", load_kg: 165, reps: 3, order_index: 1 },
        { result_type: "weight", load_kg: 165, reps: 3, order_index: 2 },
      ],
    },
    {
      title: "Ring Muscle-Up Skill",
      performed_at: new Date(now.getTime() - 53 * dayMs).toISOString(),
      session_type: "skill",
      workout_format: "benchmark",
      session_rpe: 6,
      duration_s: 1800,
      results: [{ result_type: "reps", reps: 5, order_index: 0 }],
    },
  ];

  let seeded = 0;
  for (const w of workouts) {
    const r = await fetch(`${API_URL}/api/v1/workouts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(w),
    });
    if (r.ok) seeded++;
  }
  console.log(`  ✓ Seeded ${seeded} workouts`);
}

// ── Screenshot helpers ────────────────────────────────────────────────────────

async function shot(page: Page, name: string): Promise<void> {
  const filepath = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: filepath, fullPage: false });
  console.log(`  📸 ${name}.png`);
}

async function waitForHydration(page: Page): Promise<void> {
  // Wait for content to appear (contribution graph or main heading)
  await page
    .waitForFunction(
      () => {
        const cells = Array.from(
          document.querySelectorAll(
            '[aria-label="Training contribution graph"] > div > div',
          ),
        );
        return cells.some((c) => !c.className.includes("bg-zinc-800"));
      },
      { timeout: 15000 },
    )
    .catch(() => {
      /* OK if no contribution graph on this page */
    });
  await page.waitForTimeout(400);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();

  console.log("→ Ensuring demo user…");
  const token = await ensureDemoUser();

  console.log("→ Setting display name…");
  await ensureProfile(token);

  console.log("→ Seeding workout data…");
  await ensureSeededWorkouts(token);

  console.log("→ Ensuring demo plan…");
  await ensureDemoPlan(token);

  console.log("→ Setting up browser session…");
  await loginAndSetSession(page, token);

  console.log("→ Taking screenshots…");

  // Dashboard
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle" });
  await waitForHydration(page);
  await shot(page, "revamp-dashboard");

  // History (git log --all)
  await page.goto(`${BASE_URL}/history`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await shot(page, "revamp-history");

  // Log result — detail page for the most recent workout
  const listRes = await fetch(`${API_URL}/api/v1/workouts?limit=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const listData = (await listRes.json()) as { items: Array<{ id: string }> };
  if (listData.items.length > 0) {
    const firstId = listData.items[0]!.id;
    await page.goto(`${BASE_URL}/history/${firstId}`, {
      waitUntil: "networkidle",
    });
    await page.waitForTimeout(500);
    await shot(page, "revamp-log-result");
  }

  // Track / NL log entry (git commit -m)
  await page.goto(`${BASE_URL}/track`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await shot(page, "revamp-track");

  // Plans (git branch --list)
  await page.goto(`${BASE_URL}/plans`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await shot(page, "revamp-plans");

  // Plan wizard — step 1 (archetype selection)
  await page.goto(`${BASE_URL}/plans/new`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await shot(page, "revamp-plan-wizard");

  // Plan detail — navigate to the first plan
  const plansRes = await fetch(`${API_URL}/api/v1/plans`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (plansRes.ok) {
    const plansData = (await plansRes.json()) as Array<{
      id: string;
      sessions?: Array<{ id: string }>;
    }>;
    if (plansData.length > 0) {
      const planId = plansData[0]!.id;
      await page.goto(`${BASE_URL}/plans/${planId}`, {
        waitUntil: "networkidle",
      });
      await page.waitForTimeout(1000);
      await shot(page, "revamp-plan-detail");

      // Session execution — use the sessions embedded in the plan detail response
      const planDetailRes = await fetch(`${API_URL}/api/v1/plans/${planId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (planDetailRes.ok) {
        const planDetail = (await planDetailRes.json()) as {
          sessions: Array<{ id: string }>;
        };
        if (planDetail.sessions.length > 0) {
          const sessId = planDetail.sessions[0]!.id;
          await page.goto(
            `${BASE_URL}/plans/${planId}/sessions/${sessId}/execute`,
            {
              waitUntil: "networkidle",
            },
          );
          await page.waitForTimeout(800);
          await shot(page, "revamp-session-execute");
        }
      }
    }
  }

  // Records (git tag --list)
  await page.goto(`${BASE_URL}/records`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await shot(page, "revamp-records");

  // Analytics (CTL / ATL / TSB)
  await page.goto(`${BASE_URL}/analytics`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await shot(page, "revamp-analytics");

  // Coach (streaming chat)
  await page.goto(`${BASE_URL}/coach`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await shot(page, "revamp-coach");

  // Profile
  await page.goto(`${BASE_URL}/profile`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await shot(page, "revamp-profile");

  await browser.close();
  console.log(`\n✅ Screenshots saved to ${SCREENSHOT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
