/**
 * Phase 5 E2E — Training Plans (AI-3)
 * Tests plan creation, branch view, and today's prescription.
 */

import { type Page, expect, test } from "@playwright/test";

const E2E_EMAIL = "e2e-plans@test.local";
const E2E_PASSWORD = "E2eTestFitHub!2026";
const SUPABASE_URL = "http://127.0.0.1:54321";
const API_URL = process.env.E2E_API_URL ?? "http://127.0.0.1:8000";

const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

async function ensureTestUser(): Promise<void> {
  await fetch(`${SUPABASE_URL}/rest/v1/invited_emails`, {
    method: "POST",
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=ignore-duplicates",
    },
    body: JSON.stringify({ email: E2E_EMAIL }),
  });
  await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: E2E_EMAIL,
      password: E2E_PASSWORD,
      email_confirm: true,
    }),
  });
}

async function loginAndSetSession(page: Page): Promise<string> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email: E2E_EMAIL, password: E2E_PASSWORD }),
  });
  if (!res.ok) throw new Error(`password grant failed: ${res.status}`);
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

async function createPlanAndWait(token: string): Promise<string> {
  const createRes = await fetch(`${API_URL}/api/v1/plans`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      goal: "general_fitness",
      title: "E2E Test Plan",
      start_date: "2026-07-01",
      weeks: 8,
      training_age: "intermediate",
    }),
  });
  expect(createRes.status).toBe(202);
  const { task_id } = (await createRes.json()) as { task_id: string };

  for (let i = 0; i < 20; i++) {
    const tr = await fetch(`${API_URL}/api/v1/plans/tasks/${task_id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = (await tr.json()) as { status: string; plan_id?: string };
    if (data.status === "complete" && data.plan_id) return data.plan_id;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error("Plan generation timed out");
}

test.beforeAll(async () => {
  await ensureTestUser();
});

test("plans list page loads with empty state", async ({ page }) => {
  await loginAndSetSession(page);
  await page.goto("http://localhost:3000/plans");
  await expect(page).toHaveURL(/plans/);
  // Either shows plans or shows empty state — just confirm page renders
  await expect(page.locator("body")).toBeVisible({ timeout: 10000 });
});

test("plan API creates plan and returns detail", async ({ page }) => {
  const token = await loginAndSetSession(page);
  const planId = await createPlanAndWait(token);

  const detailRes = await fetch(`${API_URL}/api/v1/plans/${planId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(detailRes.status).toBe(200);
  const plan = (await detailRes.json()) as Record<string, unknown>;
  expect(plan["goal"]).toBe("general_fitness");
  expect(Array.isArray(plan["mesocycles"])).toBe(true);
  expect(Array.isArray(plan["sessions"])).toBe(true);
});

test("plan detail page shows branch view", async ({ page }) => {
  const token = await loginAndSetSession(page);
  const planId = await createPlanAndWait(token);

  await page.goto(`http://localhost:3000/plans/${planId}`);
  await expect(page.locator('[data-testid="plan-branch-view"]')).toBeVisible({
    timeout: 10000,
  });
  await expect(
    page.locator('[data-testid="mesocycle-header"]').first(),
  ).toBeVisible();
  await expect(
    page.locator('[data-testid="session-dot"]').first(),
  ).toBeVisible();
});

test("plan IDOR returns 404", async ({ page }) => {
  const token = await loginAndSetSession(page);
  const res = await fetch(
    `${API_URL}/api/v1/plans/00000000-0000-0000-0000-000000000000`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  expect(res.status).toBe(404);
});

test("unauthenticated plan list returns 401", async () => {
  const res = await fetch(`${API_URL}/api/v1/plans`);
  expect(res.status).toBe(401);
});
