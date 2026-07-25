/**
 * Redesign screenshot script.
 *
 * Captures the full set of screenshots for FitHub's redesigned `(shell)` route
 * group plus the top-level auth/onboarding/admin pages, at both desktop
 * (1280x900) and mobile (375x812) viewports. Unlike `take-screenshots.ts`
 * (legacy `(app)` pages, README-only subset), this covers every redesigned
 * page and writes the full set to `screenshots/full/`, plus a local HTML
 * gallery.
 *
 * Prerequisites (must be running):
 *   - supabase start
 *   - alembic upgrade head
 *   - FastAPI on http://127.0.0.1:8000
 *   - Next.js dev server on http://localhost:3000
 *
 * Admin pages (`/admin/*`) additionally require the FastAPI process to have
 * `ADMIN_USER_IDS_CSV` set to the primary demo user's UUID. Run this script
 * once first (it prints the UUID after creating the user), restart the API
 * with that env var, then re-run with ADMIN_PASS=1 to capture admin pages
 * without re-seeding everything from scratch:
 *
 *   pnpm -C apps/web exec ts-node --project tsconfig.json e2e/take-redesign-screenshots.ts
 *   ADMIN_USER_IDS_CSV=<uuid> uv run --project apps/api uvicorn app.main:app --reload --app-dir apps/api &
 *   ADMIN_PASS=1 pnpm -C apps/web exec ts-node --project tsconfig.json e2e/take-redesign-screenshots.ts
 */

import { type BrowserContext, type Page, chromium } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const SUPABASE_URL = "http://127.0.0.1:54321";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

const API_URL = process.env.SEED_API_URL ?? "http://127.0.0.1:8000";
const BASE_URL = "http://localhost:3000";
const FULL_DIR = path.join(__dirname, "../../..", "screenshots", "full");
const UUID_FILE = path.join(FULL_DIR, ".primary-user-id");

const PASSWORD = "DemoFitHub!2026";

const PRIMARY_EMAIL = "alex.rivera@fithub.local";
const PRIMARY_NAME = "Alex Rivera";
const PARTNER_EMAIL = "jane.doe@fithub.local";
const PARTNER_NAME = "Jane Doe";
const ONBOARDING_EMAIL = "sam.newcomer@fithub.local";
const ONBOARDING_NAME = "Sam Newcomer";

const ADMIN_PASS = process.env.ADMIN_PASS === "1";

const DESKTOP_VIEWPORT = { width: 1280, height: 900 };
const MOBILE_VIEWPORT = { width: 375, height: 812 };

interface GalleryEntry {
  section: string;
  name: string;
  caption: string;
}

const gallery: GalleryEntry[] = [];

// ── Generic fetch helpers ───────────────────────────────────────────────────

async function authedFetch(
  urlPath: string,
  token: string,
  init?: RequestInit,
): Promise<Response> {
  return fetch(`${API_URL}${urlPath}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

// ── Auth helpers ─────────────────────────────────────────────────────────────

async function ensureUser(email: string): Promise<string> {
  await fetch(`${SUPABASE_URL}/rest/v1/invited_emails`, {
    method: "POST",
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=ignore-duplicates",
    },
    body: JSON.stringify({ email }),
  });

  const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password: PASSWORD, email_confirm: true }),
  });

  if (createRes.ok) {
    const created = (await createRes.json()) as { id: string };
    return created.id;
  }

  // Already exists — look it up.
  const listRes = await fetch(
    `${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
    {
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
    },
  );
  const listData = (await listRes.json()) as {
    users: Array<{ id: string; email: string }>;
  };
  const existing = listData.users.find((u) => u.email === email);
  if (!existing) throw new Error(`Could not create or find user ${email}`);
  return existing.id;
}

async function getToken(email: string): Promise<string> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  if (!res.ok)
    throw new Error(`password grant failed for ${email}: ${res.status}`);
  const session = (await res.json()) as { access_token: string };
  return session.access_token;
}

async function newViewportContexts(
  browser: import("@playwright/test").Browser,
  email: string,
): Promise<{ desktop: Page; mobile: Page; contexts: BrowserContext[] }> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  if (!res.ok) throw new Error(`auth failed for ${email}: ${res.status}`);
  const session = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_at: number;
    token_type: string;
    user: Record<string, unknown>;
  };
  const encoded =
    "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url");
  const cookie = {
    name: "sb-localhost-auth-token",
    value: encoded,
    domain: "localhost",
    path: "/",
    httpOnly: false,
    secure: false,
    sameSite: "Lax" as const,
  };

  const desktopCtx = await browser.newContext({ viewport: DESKTOP_VIEWPORT });
  await desktopCtx.addCookies([cookie]);
  const mobileCtx = await browser.newContext({ viewport: MOBILE_VIEWPORT });
  await mobileCtx.addCookies([cookie]);

  return {
    desktop: await desktopCtx.newPage(),
    mobile: await mobileCtx.newPage(),
    contexts: [desktopCtx, mobileCtx],
  };
}

// ── Data seeding ─────────────────────────────────────────────────────────────

async function ensureProfile(
  token: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const res = await authedFetch("/api/v1/profile", token, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  if (!res.ok)
    console.warn(
      `  ⚠ profile patch returned ${res.status}: ${await res.text()}`,
    );
}

async function resolveMovement(
  token: string,
  query: string,
): Promise<{ id: string; slug: string } | null> {
  const res = await authedFetch(
    `/api/v1/movements?query=${encodeURIComponent(query)}&limit=5`,
    token,
  );
  if (!res.ok) return null;
  const movements = (await res.json()) as Array<{
    id: string;
    slug: string;
    name: string;
  }>;
  const exact = movements.find(
    (m) => m.name.toLowerCase() === query.toLowerCase(),
  );
  const pick = exact ?? movements[0];
  return pick ? { id: pick.id, slug: pick.slug } : null;
}

async function ensureSeededWorkouts(
  token: string,
  movementIds: Record<string, string>,
): Promise<void> {
  const listRes = await authedFetch("/api/v1/workouts?limit=25", token);
  const listData = (await listRes.json()) as { items: unknown[] };
  if (listData.items.length >= 20) {
    console.log(`  ✓ ${listData.items.length}+ workouts already seeded`);
    return;
  }

  const now = new Date();
  const dayMs = 86400 * 1000;
  const back_squat = movementIds["back squat"];
  const deadlift = movementIds["deadlift"];
  const snatch = movementIds["snatch"];

  const weightResult = (
    movementId: string | undefined,
    load_kg: number,
    reps: number,
    order_index: number,
  ) => ({
    movement_id: movementId,
    result_type: "weight",
    load_kg,
    reps,
    order_index,
  });

  const workouts = [
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
        weightResult(back_squat, 120, 5, 0),
        weightResult(back_squat, 120, 5, 1),
        weightResult(back_squat, 122.5, 5, 2),
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
    {
      title: "Snatch Skill Work",
      performed_at: new Date(now.getTime() - 6 * dayMs).toISOString(),
      session_type: "skill",
      workout_format: "benchmark",
      session_rpe: 6,
      duration_s: 2400,
      results: [
        weightResult(snatch, 60, 3, 0),
        weightResult(snatch, 62.5, 2, 1),
      ],
    },
    {
      title: "Annie",
      performed_at: new Date(now.getTime() - 8 * dayMs).toISOString(),
      session_type: "metcon",
      workout_format: "for_time",
      session_rpe: 8,
      duration_s: 720,
      results: [{ result_type: "time", time_s: 718, order_index: 0 }],
    },
    {
      title: "Deadlift 3×3",
      performed_at: new Date(now.getTime() - 10 * dayMs).toISOString(),
      session_type: "strength",
      workout_format: "strength",
      session_rpe: 8,
      duration_s: 3000,
      results: [
        weightResult(deadlift, 160, 3, 0),
        weightResult(deadlift, 160, 3, 1),
        weightResult(deadlift, 165, 3, 2),
      ],
    },
    {
      title: "Helen",
      performed_at: new Date(now.getTime() - 13 * dayMs).toISOString(),
      session_type: "metcon",
      workout_format: "for_time",
      session_rpe: 8,
      duration_s: 780,
      notes: "3 rounds: 400m run, 21 KB swings, 12 pull-ups",
      results: [{ result_type: "time", time_s: 768, order_index: 0 }],
    },
    {
      title: "Active Recovery",
      performed_at: new Date(now.getTime() - 14 * dayMs).toISOString(),
      session_type: "active_recovery",
      workout_format: "intervals",
      session_rpe: 3,
      duration_s: 1800,
    },
    {
      title: "Strict Press 5×5",
      performed_at: new Date(now.getTime() - 15 * dayMs).toISOString(),
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
    {
      title: "Grace",
      performed_at: new Date(now.getTime() - 20 * dayMs).toISOString(),
      session_type: "metcon",
      workout_format: "for_time",
      session_rpe: 9,
      duration_s: 120,
      notes: "30 clean and jerks for time at 60kg",
      results: [{ result_type: "time", time_s: 118, order_index: 0 }],
    },
    {
      title: "Back Squat 3×3",
      performed_at: new Date(now.getTime() - 22 * dayMs).toISOString(),
      session_type: "strength",
      workout_format: "strength",
      session_rpe: 9,
      duration_s: 3600,
      results: [
        weightResult(back_squat, 130, 3, 0),
        weightResult(back_squat, 130, 3, 1),
        weightResult(back_squat, 130, 3, 2),
      ],
    },
    {
      title: "Isabel",
      performed_at: new Date(now.getTime() - 27 * dayMs).toISOString(),
      session_type: "metcon",
      workout_format: "for_time",
      session_rpe: 9,
      duration_s: 180,
      notes: "30 snatches for time at 60kg",
      results: [{ result_type: "time", time_s: 174, order_index: 0 }],
    },
    {
      title: "Active Recovery",
      performed_at: new Date(now.getTime() - 28 * dayMs).toISOString(),
      session_type: "active_recovery",
      workout_format: "intervals",
      session_rpe: 3,
      duration_s: 2400,
    },
    {
      title: "Bench Press 5×5",
      performed_at: new Date(now.getTime() - 30 * dayMs).toISOString(),
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
    {
      title: "Karen",
      performed_at: new Date(now.getTime() - 34 * dayMs).toISOString(),
      session_type: "metcon",
      workout_format: "for_time",
      session_rpe: 8,
      duration_s: 600,
      notes: "150 wall balls for time at 9kg",
      results: [{ result_type: "time", time_s: 592, order_index: 0 }],
    },
    {
      title: "Deadlift 5×5",
      performed_at: new Date(now.getTime() - 36 * dayMs).toISOString(),
      session_type: "strength",
      workout_format: "strength",
      session_rpe: 8,
      duration_s: 3600,
      results: [
        weightResult(deadlift, 150, 5, 0),
        weightResult(deadlift, 150, 5, 1),
        weightResult(deadlift, 150, 5, 2),
      ],
    },
    {
      title: "Cindy",
      performed_at: new Date(now.getTime() - 41 * dayMs).toISOString(),
      session_type: "metcon",
      workout_format: "amrap",
      session_rpe: 7,
      duration_s: 1200,
      notes: "AMRAP 20: 5 pull-ups, 10 push-ups, 15 air squats",
      results: [{ result_type: "reps", reps: 22, order_index: 0 }],
    },
    {
      title: "Back Squat 5×5",
      performed_at: new Date(now.getTime() - 43 * dayMs).toISOString(),
      session_type: "strength",
      workout_format: "strength",
      session_rpe: 8,
      duration_s: 3600,
      results: [
        weightResult(back_squat, 115, 5, 0),
        weightResult(back_squat, 115, 5, 1),
        weightResult(back_squat, 115, 5, 2),
      ],
    },
    {
      title: "Active Recovery",
      performed_at: new Date(now.getTime() - 44 * dayMs).toISOString(),
      session_type: "active_recovery",
      workout_format: "intervals",
      session_rpe: 3,
      duration_s: 1800,
    },
    {
      title: "Nancy",
      performed_at: new Date(now.getTime() - 48 * dayMs).toISOString(),
      session_type: "metcon",
      workout_format: "for_time",
      session_rpe: 8,
      duration_s: 1080,
      notes: "5 rounds: 400m run, 15 overhead squats at 43kg",
      results: [{ result_type: "time", time_s: 1062, order_index: 0 }],
    },
    {
      title: "Deadlift 3×3",
      performed_at: new Date(now.getTime() - 50 * dayMs).toISOString(),
      session_type: "strength",
      workout_format: "strength",
      session_rpe: 9,
      duration_s: 3000,
      results: [
        weightResult(deadlift, 165, 3, 0),
        weightResult(deadlift, 165, 3, 1),
        weightResult(deadlift, 165, 3, 2),
      ],
    },
    {
      title: "Ring Muscle-Up Skill",
      performed_at: new Date(now.getTime() - 52 * dayMs).toISOString(),
      session_type: "skill",
      workout_format: "benchmark",
      session_rpe: 6,
      duration_s: 1800,
      results: [{ result_type: "reps", reps: 5, order_index: 0 }],
    },
  ];

  let seeded = 0;
  for (const w of workouts) {
    const r = await authedFetch("/api/v1/workouts", token, {
      method: "POST",
      body: JSON.stringify(w),
    });
    if (r.ok) seeded++;
    else console.warn(`  ⚠ workout "${w.title}" returned ${r.status}`);
  }
  console.log(`  ✓ Seeded ${seeded}/${workouts.length} workouts`);
}

async function ensurePlan(token: string): Promise<string | null> {
  const listRes = await authedFetch("/api/v1/plans", token);
  if (listRes.ok) {
    const plans = (await listRes.json()) as Array<{ id: string }>;
    if (plans.length > 0) {
      console.log(`  ✓ Plan already exists (${plans[0]!.id})`);
      return plans[0]!.id;
    }
  }

  const start = new Date(Date.now() - 5 * 86400 * 1000);
  const startDate = `${start.getFullYear()}-${String(
    start.getMonth() + 1,
  ).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;

  const createRes = await authedFetch("/api/v1/plans", token, {
    method: "POST",
    body: JSON.stringify({
      archetype: "general-crossfit",
      title: "General CrossFit — 8 Weeks",
      start_date: startDate,
      weeks: 8,
      training_age: "intermediate",
      equipment: ["barbell", "pull-up bar", "kettlebell"],
      days_per_week: 5,
    }),
  });
  if (!createRes.ok) {
    console.warn(
      `  ⚠ Plan create returned ${createRes.status} — skipping plan screenshots`,
    );
    return null;
  }
  const taskData = (await createRes.json()) as { task_id: string };
  console.log(`  → Plan task created: ${taskData.task_id}`);

  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 1500));
    const pollRes = await authedFetch(
      `/api/v1/plans/tasks/${taskData.task_id}`,
      token,
    );
    if (!pollRes.ok) continue;
    const poll = (await pollRes.json()) as { status: string; plan_id?: string };
    if (poll.status === "complete" && poll.plan_id) {
      console.log(`  ✓ Plan generated (plan_id=${poll.plan_id})`);
      return poll.plan_id;
    }
    if (poll.status === "failed") {
      console.warn(`  ⚠ Plan generation failed — skipping plan screenshots`);
      return null;
    }
  }
  console.warn(`  ⚠ Plan generation timed out`);
  return null;
}

async function detectAdaptations(token: string, planId: string): Promise<void> {
  const res = await authedFetch(
    `/api/v1/plans/${planId}/adaptations/detect`,
    token,
    {
      method: "POST",
    },
  );
  if (res.ok) {
    const data = (await res.json()) as { proposed_adaptations: unknown[] };
    console.log(
      `  ✓ Adaptation detection: ${data.proposed_adaptations.length} proposed`,
    );
  } else if (res.status === 429) {
    console.log(
      `  ✓ Adaptation detect rate-limited (already run recently) — skipping`,
    );
  } else {
    console.warn(`  ⚠ Adaptation detect returned ${res.status}`);
  }
}

async function ensureInjury(token: string): Promise<void> {
  const listRes = await authedFetch("/api/v1/injuries", token);
  if (listRes.ok) {
    const injuries = (await listRes.json()) as unknown[];
    if (injuries.length > 0) {
      console.log(`  ✓ Injury already exists`);
      return;
    }
  }
  const res = await authedFetch("/api/v1/injuries", token, {
    method: "POST",
    body: JSON.stringify({
      body_region: "knee",
      pain_level: 4,
      mechanism: "acute",
      notes: "Tweaked it landing a box jump during Tuesday's metcon.",
    }),
  });
  if (res.ok) console.log(`  ✓ Injury reported`);
  else console.warn(`  ⚠ Injury report returned ${res.status}`);
}

async function ensureWellnessCheckin(token: string): Promise<void> {
  const res = await authedFetch("/api/v1/wellness/checkin", token, {
    method: "POST",
    body: JSON.stringify({ sleep: 5, stress: 3, fatigue: 4, soreness: 3 }),
  });
  if (res.ok) console.log(`  ✓ Wellness checkin submitted`);
  else console.warn(`  ⚠ Wellness checkin returned ${res.status}`);
}

async function seedCoachSession(token: string): Promise<string> {
  const sessionId = crypto.randomUUID();
  const questions = [
    "What should I focus on this week given my recent squat volume?",
    "Any tips for improving my snatch technique?",
  ];
  for (const question of questions) {
    const res = await authedFetch("/api/v1/coach/chat", token, {
      method: "POST",
      body: JSON.stringify({ question, session_id: sessionId }),
    });
    if (!res.ok) console.warn(`  ⚠ coach chat returned ${res.status}`);
  }
  console.log(`  ✓ Coach session seeded (${sessionId})`);
  return sessionId;
}

async function ensureTrainingPartner(
  token: string,
  partnerEmail: string,
): Promise<void> {
  const res = await authedFetch("/api/v1/training-partners", token, {
    method: "POST",
    body: JSON.stringify({ email: partnerEmail }),
  });
  if (res.ok || res.status === 409) {
    console.log(`  ✓ Training partner linked`);
  } else {
    console.warn(
      `  ⚠ Add training partner returned ${res.status}: ${await res.text()}`,
    );
  }
}

async function ensureTeamSession(
  token: string,
  partnerUserId: string,
): Promise<string | null> {
  const listRes = await authedFetch("/api/v1/team-sessions?limit=5", token);
  if (listRes.ok) {
    const data = (await listRes.json()) as { items: Array<{ id: string }> };
    if (data.items.length > 0) {
      console.log(`  ✓ Team session already exists (${data.items[0]!.id})`);
      return data.items[0]!.id;
    }
  }

  const res = await authedFetch("/api/v1/team-sessions", token, {
    method: "POST",
    body: JSON.stringify({
      performed_at: new Date().toISOString(),
      name: "Saturday Partner WOD",
      team_size: 2,
      scoring_type: "for_time",
      status: "completed",
      team_score: "18:42",
      team_score_s: 1122,
      notes: "Partner chipper — split reps evenly, rotating every round.",
      participants: [{ user_id: partnerUserId, role: "Rx" }],
    }),
  });
  if (!res.ok) {
    console.warn(
      `  ⚠ Create team session returned ${res.status}: ${await res.text()}`,
    );
    return null;
  }
  const created = (await res.json()) as { id: string };
  console.log(`  ✓ Team session created (${created.id})`);
  return created.id;
}

async function ensureAccessRequests(): Promise<void> {
  const requests = [
    {
      email: "morgan.taylor@example.com",
      name: "Morgan Taylor",
      motivation: "Friend of Alex, wants to track CrossFit PRs.",
    },
    {
      email: "casey.kim@example.com",
      name: "Casey Kim",
      motivation: "Looking for an ACWR-aware training log.",
    },
  ];
  for (const req of requests) {
    const res = await fetch(`${API_URL}/api/v1/access-requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
    if (res.ok || res.status === 409 || res.status === 429) {
      console.log(`  ✓ Access request seeded/exists: ${req.email}`);
    } else {
      console.warn(
        `  ⚠ Access request for ${req.email} returned ${res.status}`,
      );
    }
  }
}

async function ensureAllowlistEntries(token: string): Promise<void> {
  const emails = ["taylor.reed@example.com", "jordan.blake@example.com"];
  for (const email of emails) {
    const res = await authedFetch("/api/v1/admin/invited-emails", token, {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    if (res.ok || res.status === 409) {
      console.log(`  ✓ Allowlist entry seeded/exists: ${email}`);
    } else {
      console.warn(
        `  ⚠ Allowlist add for ${email} returned ${res.status} (admin not active yet?)`,
      );
    }
  }
}

// ── Screenshot helpers ───────────────────────────────────────────────────────

async function waitForHydration(page: Page): Promise<void> {
  await page
    .waitForFunction(
      () => document.querySelectorAll('[class*="animate-pulse"]').length === 0,
      { timeout: 10000 },
    )
    .catch(() => {
      /* fine if the page never had skeletons */
    });
  await page.waitForTimeout(400);
}

async function shot(page: Page, name: string): Promise<void> {
  const filepath = path.join(FULL_DIR, `${name}.png`);
  await page.screenshot({ path: filepath, fullPage: false });
  console.log(`  📸 ${name}.png`);
}

async function captureBoth(
  desktop: Page,
  mobile: Page,
  urlPath: string,
  name: string,
  section: string,
  caption: string,
  opts: { requireUrlIncludes?: string } = {},
): Promise<void> {
  for (const [page, suffix] of [
    [desktop, "desktop"],
    [mobile, "mobile"],
  ] as const) {
    try {
      await page.goto(`${BASE_URL}${urlPath}`, {
        waitUntil: "networkidle",
        timeout: 20000,
      });
      await waitForHydration(page);
      if (
        opts.requireUrlIncludes &&
        !page.url().includes(opts.requireUrlIncludes)
      ) {
        console.warn(
          `  ⚠ ${urlPath} redirected to ${page.url()} — skipping ${name}-${suffix} (not admin yet?)`,
        );
        continue;
      }
      await shot(page, `${name}-${suffix}`);
    } catch (err) {
      console.warn(`  ⚠ ${urlPath} (${suffix}) failed: ${String(err)}`);
    }
  }
  gallery.push({ section, name, caption });
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  fs.mkdirSync(FULL_DIR, { recursive: true });

  console.log("→ Ensuring primary demo user…");
  const primaryId = await ensureUser(PRIMARY_EMAIL);
  fs.writeFileSync(UUID_FILE, primaryId, "utf-8");
  console.log(`  ✓ Primary user id: ${primaryId} (written to ${UUID_FILE})`);

  console.log("→ Ensuring partner demo user…");
  const partnerId = await ensureUser(PARTNER_EMAIL);
  console.log(`  ✓ Partner user id: ${partnerId}`);

  console.log("→ Ensuring onboarding demo user…");
  await ensureUser(ONBOARDING_EMAIL);

  const primaryToken = await getToken(PRIMARY_EMAIL);
  const partnerToken = await getToken(PARTNER_EMAIL);

  if (!ADMIN_PASS) {
    console.log("→ Setting profiles…");
    await ensureProfile(primaryToken, {
      display_name: PRIMARY_NAME,
      weight_unit: "kg",
      onboarding_completed: true,
      training_level: "intermediate",
      primary_goal: "general_fitness",
      equipment_access: ["barbell", "dumbbells", "kettlebells", "rig_pull_up"],
    });
    await ensureProfile(partnerToken, {
      display_name: PARTNER_NAME,
      weight_unit: "kg",
      onboarding_completed: true,
    });

    console.log("→ Resolving movement ids for PR-linked lifts…");
    const [backSquat, deadlift, snatch] = await Promise.all([
      resolveMovement(primaryToken, "back squat"),
      resolveMovement(primaryToken, "deadlift"),
      resolveMovement(primaryToken, "snatch"),
    ]);
    const movementIds: Record<string, string> = {};
    if (backSquat) movementIds["back squat"] = backSquat.id;
    if (deadlift) movementIds["deadlift"] = deadlift.id;
    if (snatch) movementIds["snatch"] = snatch.id;
    console.log(
      `  ✓ Resolved: ${Object.keys(movementIds).join(", ") || "none"}`,
    );

    console.log("→ Seeding workout history…");
    await ensureSeededWorkouts(primaryToken, movementIds);

    console.log("→ Ensuring demo plan…");
    const planId = await ensurePlan(primaryToken);

    console.log("→ Reporting an injury…");
    await ensureInjury(primaryToken);

    console.log("→ Submitting today's wellness check-in…");
    await ensureWellnessCheckin(primaryToken);

    if (planId) {
      console.log("→ Detecting plan adaptations…");
      await detectAdaptations(primaryToken, planId);
    }

    console.log("→ Seeding a coach chat session…");
    const coachSessionId = await seedCoachSession(primaryToken);
    fs.writeFileSync(
      path.join(FULL_DIR, ".coach-session-id"),
      coachSessionId,
      "utf-8",
    );

    console.log("→ Linking training partner…");
    await ensureTrainingPartner(primaryToken, PARTNER_EMAIL);

    console.log("→ Creating team session with partner…");
    const teamSessionId = await ensureTeamSession(primaryToken, partnerId);
    if (teamSessionId) {
      fs.writeFileSync(
        path.join(FULL_DIR, ".team-session-id"),
        teamSessionId,
        "utf-8",
      );
    }

    console.log("→ Seeding access requests…");
    await ensureAccessRequests();
  } else {
    console.log("→ ADMIN_PASS=1: skipping re-seed, reusing existing data");
  }

  console.log("→ Seeding allowlist entries (requires admin)…");
  await ensureAllowlistEntries(primaryToken);

  // Re-fetch ids that may have been seeded in a prior run.
  const planListRes = await authedFetch("/api/v1/plans", primaryToken);
  const plans = planListRes.ok
    ? ((await planListRes.json()) as Array<{ id: string }>)
    : [];
  const planId = plans[0]?.id ?? null;

  let planDetail: {
    sessions: Array<{ id: string; scheduled_date: string; status: string }>;
  } | null = null;
  if (planId) {
    const detailRes = await authedFetch(
      `/api/v1/plans/${planId}`,
      primaryToken,
    );
    if (detailRes.ok) planDetail = await detailRes.json();
  }
  const today = new Date().toISOString().slice(0, 10);
  const upcomingSession =
    planDetail?.sessions
      .filter((s) => s.status === "prescribed" && s.scheduled_date >= today)
      .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))[0] ??
    planDetail?.sessions[0] ??
    null;

  const workoutListRes = await authedFetch(
    "/api/v1/workouts?limit=1",
    primaryToken,
  );
  const workoutList = workoutListRes.ok
    ? ((await workoutListRes.json()) as {
        items: Array<{ short_hash: string }>;
      })
    : { items: [] };
  const workoutHash = workoutList.items[0]?.short_hash ?? null;

  const backSquatSlug = await resolveMovement(primaryToken, "back squat");
  // Back squat has seeded weight results with movement_id set (see
  // ensureSeededWorkouts), so its personal-record detail page has real data.
  const recordMovementId: string | null = backSquatSlug?.id ?? null;

  let coachSessionId: string | null = null;
  try {
    coachSessionId = fs
      .readFileSync(path.join(FULL_DIR, ".coach-session-id"), "utf-8")
      .trim();
  } catch {
    /* not seeded yet in this run's phase */
  }

  let teamSessionId: string | null = null;
  try {
    teamSessionId = fs
      .readFileSync(path.join(FULL_DIR, ".team-session-id"), "utf-8")
      .trim();
  } catch {
    /* not seeded yet in this run's phase */
  }

  console.log("→ Launching browser…");
  const browser = await chromium.launch({ headless: true });
  const allContexts: BrowserContext[] = [];

  if (!ADMIN_PASS) {
    // ── Logged-out pages ────────────────────────────────────────────────────
    console.log("→ Capturing auth pages (logged out)…");
    const loggedOutCtxDesktop = await browser.newContext({
      viewport: DESKTOP_VIEWPORT,
    });
    const loggedOutCtxMobile = await browser.newContext({
      viewport: MOBILE_VIEWPORT,
    });
    allContexts.push(loggedOutCtxDesktop, loggedOutCtxMobile);
    const loDesktop = await loggedOutCtxDesktop.newPage();
    const loMobile = await loggedOutCtxMobile.newPage();
    await captureBoth(
      loDesktop,
      loMobile,
      "/login",
      "login",
      "Auth & Onboarding",
      "Login",
    );
    await captureBoth(
      loDesktop,
      loMobile,
      "/access-paused",
      "access-paused",
      "Auth & Onboarding",
      "Access paused",
    );

    // ── Onboarding (dedicated user, never completes) ───────────────────────
    console.log("→ Capturing onboarding wizard…");
    const {
      desktop: obDesktop,
      mobile: obMobile,
      contexts: obCtx,
    } = await newViewportContexts(browser, ONBOARDING_EMAIL);
    allContexts.push(...obCtx);
    await ensureProfile(await getToken(ONBOARDING_EMAIL), {
      display_name: ONBOARDING_NAME,
    });
    await captureBoth(
      obDesktop,
      obMobile,
      "/onboarding",
      "onboarding-step1",
      "Auth & Onboarding",
      "Onboarding — step 1",
    );
    await captureBoth(
      obDesktop,
      obMobile,
      "/onboarding/4",
      "onboarding-step4",
      "Auth & Onboarding",
      "Onboarding — step 4",
    );
    await captureBoth(
      obDesktop,
      obMobile,
      "/onboarding/8",
      "onboarding-step8",
      "Auth & Onboarding",
      "Onboarding — step 8 (summary)",
    );
  }

  // ── Primary user pages ─────────────────────────────────────────────────────
  console.log("→ Setting up primary user session…");
  const {
    desktop,
    mobile,
    contexts: primaryCtx,
  } = await newViewportContexts(browser, PRIMARY_EMAIL);
  allContexts.push(...primaryCtx);

  if (!ADMIN_PASS) {
    console.log("→ Capturing Today…");
    await captureBoth(desktop, mobile, "/today", "today", "Today", "Today");
    await captureBoth(
      desktop,
      mobile,
      "/today/readiness",
      "today-readiness",
      "Today",
      "Readiness check-in",
    );

    console.log("→ Capturing Log/Workouts…");
    await captureBoth(
      desktop,
      mobile,
      "/log",
      "log",
      "Log & Workouts",
      "Log hub",
    );
    await captureBoth(
      desktop,
      mobile,
      "/log/describe",
      "log-describe",
      "Log & Workouts",
      "Describe workout (NL parser)",
    );
    await captureBoth(
      desktop,
      mobile,
      "/log/history",
      "log-history",
      "Log & Workouts",
      "History",
    );
    await captureBoth(
      desktop,
      mobile,
      "/movements",
      "movements",
      "Log & Workouts",
      "Movements",
    );
    if (backSquatSlug) {
      await captureBoth(
        desktop,
        mobile,
        `/movements/${backSquatSlug.slug}/history`,
        "movement-detail",
        "Log & Workouts",
        "Movement detail — Back Squat",
      );
    }
    if (workoutHash) {
      await captureBoth(
        desktop,
        mobile,
        `/workouts/${workoutHash}`,
        "workout-detail",
        "Log & Workouts",
        "Workout detail",
      );
      await captureBoth(
        desktop,
        mobile,
        `/workouts/${workoutHash}/edit`,
        "workout-edit",
        "Log & Workouts",
        "Edit workout",
      );
    }

    console.log("→ Capturing Plan…");
    await captureBoth(desktop, mobile, "/plan", "plan", "Plan", "Plan hub");
    await captureBoth(
      desktop,
      mobile,
      "/plan/new",
      "plan-new",
      "Plan",
      "New plan wizard",
    );
    if (planId) {
      await captureBoth(
        desktop,
        mobile,
        `/plan/${planId}`,
        "plan-detail",
        "Plan",
        "Plan detail",
      );
      await captureBoth(
        desktop,
        mobile,
        `/plan/${planId}/adaptations`,
        "plan-adaptations",
        "Plan",
        "Plan adaptations",
      );
      await captureBoth(
        desktop,
        mobile,
        `/plan/${planId}/revise`,
        "plan-revise",
        "Plan",
        "Revise plan",
      );
      if (upcomingSession) {
        await captureBoth(
          desktop,
          mobile,
          `/plan/${planId}/sessions/${upcomingSession.id}`,
          "plan-session-detail",
          "Plan",
          "Planned session detail",
        );
        await captureBoth(
          desktop,
          mobile,
          `/plan/${planId}/sessions/${upcomingSession.id}/execute`,
          "plan-session-execute",
          "Plan",
          "Session execution",
        );
        await captureBoth(
          desktop,
          mobile,
          `/plan/${planId}/sessions/${upcomingSession.id}/modify`,
          "plan-session-modify",
          "Plan",
          "Modify session",
        );
      }
    }

    console.log("→ Capturing Progress…");
    await captureBoth(
      desktop,
      mobile,
      "/progress",
      "progress",
      "Progress",
      "Progress hub",
    );
    await captureBoth(
      desktop,
      mobile,
      "/progress/balance",
      "progress-balance",
      "Progress",
      "Training balance",
    );
    await captureBoth(
      desktop,
      mobile,
      "/progress/benchmarks",
      "progress-benchmarks",
      "Progress",
      "Benchmarks",
    );
    await captureBoth(
      desktop,
      mobile,
      "/progress/load",
      "progress-load",
      "Progress",
      "Load / ACWR",
    );
    await captureBoth(
      desktop,
      mobile,
      "/progress/records",
      "progress-records",
      "Progress",
      "Personal records",
    );
    if (recordMovementId) {
      await captureBoth(
        desktop,
        mobile,
        `/progress/records/${recordMovementId}`,
        "progress-record-detail",
        "Progress",
        "Record detail — Back Squat",
      );
    }
    await captureBoth(
      desktop,
      mobile,
      "/progress/streak",
      "progress-streak",
      "Progress",
      "Streak",
    );
    await captureBoth(
      desktop,
      mobile,
      "/progress/volume",
      "progress-volume",
      "Progress",
      "Volume",
    );

    console.log("→ Capturing Coach…");
    await captureBoth(desktop, mobile, "/coach", "coach", "Coach", "Coach hub");
    if (coachSessionId) {
      await captureBoth(
        desktop,
        mobile,
        `/coach/${coachSessionId}`,
        "coach-session",
        "Coach",
        "Coach chat with history",
      );
    }
    await captureBoth(
      desktop,
      mobile,
      "/coach/check-wod",
      "coach-check-wod",
      "Coach",
      "Check WOD",
    );

    console.log("→ Capturing Injuries…");
    await captureBoth(
      desktop,
      mobile,
      "/injuries",
      "injuries",
      "Injuries",
      "Injuries",
    );
    await captureBoth(
      desktop,
      mobile,
      "/injuries/wod-check",
      "injuries-wod-check",
      "Injuries",
      "WOD contraindication check",
    );

    console.log("→ Capturing Social…");
    await captureBoth(
      desktop,
      mobile,
      "/social",
      "social",
      "Social",
      "Social hub",
    );
    await captureBoth(
      desktop,
      mobile,
      "/social/team-sessions",
      "social-team-sessions",
      "Social",
      "Team sessions",
    );
    if (teamSessionId) {
      await captureBoth(
        desktop,
        mobile,
        `/social/team-sessions/${teamSessionId}`,
        "social-team-session-detail",
        "Social",
        "Team session detail",
      );
      await captureBoth(
        desktop,
        mobile,
        `/social/team-sessions/${teamSessionId}/edit`,
        "social-team-session-edit",
        "Social",
        "Edit team session",
      );
    }
    await captureBoth(
      desktop,
      mobile,
      "/social/training-partners",
      "social-training-partners",
      "Social",
      "Training partners",
    );

    console.log("→ Capturing Integrations…");
    await captureBoth(
      desktop,
      mobile,
      "/integrations",
      "integrations",
      "Integrations",
      "Integrations hub",
    );
    await captureBoth(
      desktop,
      mobile,
      "/integrations/apple-health",
      "integrations-apple-health",
      "Integrations",
      "Apple Health (not connected)",
    );

    console.log("→ Capturing Profile…");
    await captureBoth(
      desktop,
      mobile,
      "/profile",
      "profile",
      "Profile",
      "Profile",
    );
  }

  console.log("→ Capturing Admin…");
  await captureBoth(
    desktop,
    mobile,
    "/admin/access-requests",
    "admin-access-requests",
    "Admin",
    "Access requests queue",
    { requireUrlIncludes: "/admin/access-requests" },
  );
  await captureBoth(
    desktop,
    mobile,
    "/admin/users",
    "admin-users",
    "Admin",
    "User management",
    { requireUrlIncludes: "/admin/users" },
  );
  await captureBoth(
    desktop,
    mobile,
    "/admin/cost",
    "admin-cost",
    "Admin",
    "LLM cost dashboard",
    { requireUrlIncludes: "/admin/cost" },
  );
  await captureBoth(
    desktop,
    mobile,
    "/admin/infra",
    "admin-infra",
    "Admin",
    "Infra monitoring",
    { requireUrlIncludes: "/admin/infra" },
  );
  await captureBoth(
    desktop,
    mobile,
    "/admin/allowlist",
    "admin-allowlist",
    "Admin",
    "Invite allowlist",
    { requireUrlIncludes: "/admin/allowlist" },
  );
  await captureBoth(
    desktop,
    mobile,
    "/admin/knowledge-base",
    "admin-knowledge-base",
    "Admin",
    "Knowledge base",
    { requireUrlIncludes: "/admin/knowledge-base" },
  );

  for (const ctx of allContexts) await ctx.close();
  await browser.close();

  writeGallery();
  console.log(`\n✅ Screenshots saved to ${FULL_DIR}`);
  console.log(`✅ Gallery: ${path.join(FULL_DIR, "index.html")}`);
}

// ── Gallery ──────────────────────────────────────────────────────────────────

function writeGallery(): void {
  const bySection = new Map<string, GalleryEntry[]>();
  for (const entry of gallery) {
    if (!bySection.has(entry.section)) bySection.set(entry.section, []);
    bySection.get(entry.section)!.push(entry);
  }

  const sectionOrder = [
    "Auth & Onboarding",
    "Today",
    "Log & Workouts",
    "Plan",
    "Progress",
    "Coach",
    "Injuries",
    "Social",
    "Integrations",
    "Profile",
    "Admin",
  ];

  const sections = sectionOrder
    .filter((s) => bySection.has(s))
    .map((section) => {
      const entries = bySection.get(section)!;
      const cards = entries
        .map((e) => {
          const desktopExists = fs.existsSync(
            path.join(FULL_DIR, `${e.name}-desktop.png`),
          );
          const mobileExists = fs.existsSync(
            path.join(FULL_DIR, `${e.name}-mobile.png`),
          );
          return `
        <div class="card">
          <h3>${e.caption}</h3>
          <div class="pair">
            ${
              desktopExists
                ? `<a href="${e.name}-desktop.png" target="_blank"><img src="${e.name}-desktop.png" alt="${e.caption} — desktop" class="desktop-img"></a>`
                : `<div class="missing">no desktop capture</div>`
            }
            ${
              mobileExists
                ? `<a href="${e.name}-mobile.png" target="_blank"><img src="${e.name}-mobile.png" alt="${e.caption} — mobile" class="mobile-img"></a>`
                : `<div class="missing">no mobile capture</div>`
            }
          </div>
        </div>`;
        })
        .join("\n");
      return `
      <section>
        <h2>${section}</h2>
        <div class="grid">${cards}</div>
      </section>`;
    })
    .join("\n");

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>FitHub redesign — full screenshot gallery</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 32px;
    background: #0d1117; color: #e6edf3;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }
  h1 { font-size: 1.75rem; margin-bottom: 4px; }
  p.sub { color: #8b949e; margin-top: 0; }
  h2 {
    margin-top: 48px; padding-bottom: 8px;
    border-bottom: 1px solid #30363d;
    font-size: 1.3rem;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
    gap: 24px;
    margin-top: 16px;
  }
  .card {
    background: #161b22; border: 1px solid #30363d; border-radius: 8px;
    padding: 16px;
  }
  .card h3 { margin: 0 0 12px; font-size: 0.95rem; color: #e6edf3; }
  .pair { display: flex; gap: 12px; align-items: flex-start; }
  .desktop-img { width: 72%; border-radius: 4px; border: 1px solid #30363d; }
  .mobile-img { width: 26%; border-radius: 4px; border: 1px solid #30363d; }
  img { display: block; max-width: 100%; }
  .missing {
    flex: 1; padding: 24px 8px; text-align: center;
    color: #8b949e; font-size: 0.8rem;
    border: 1px dashed #30363d; border-radius: 4px;
  }
</style>
</head>
<body>
  <h1>FitHub redesign — full screenshot gallery</h1>
  <p class="sub">Generated locally by <code>apps/web/e2e/take-redesign-screenshots.ts</code>. Desktop (1280×900) + mobile (375×812) per page.</p>
  ${sections}
</body>
</html>`;

  fs.writeFileSync(path.join(FULL_DIR, "index.html"), html, "utf-8");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
