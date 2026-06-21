/**
 * Phase 5 E2E — Training Plans (AI-3)
 * Tests plan creation, branch view, and today's prescription.
 */

import { type Page, expect, test } from "@playwright/test";

const E2E_EMAIL = "e2e-plans@test.local";
const E2E_PASSWORD = "E2eTestFitHub!2026";
const SUPABASE_URL = "http://127.0.0.1:54321";
const API_URL = process.env.E2E_API_URL ?? "http://127.0.0.1:8000";
const LIVE_LLM = process.env.LIVE_LLM === "true";

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
  // Use a 4-week plan in live-LLM mode to reduce Ollama generation time (min weeks=4)
  const weeks = LIVE_LLM ? 4 : 8;
  const createRes = await fetch(`${API_URL}/api/v1/plans`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      // Bypass per-IP rate limit in E2E tests (server generates unique bucket per request)
      "X-Test-User-Id": "e2e-plans",
    },
    body: JSON.stringify({
      goal: "general_fitness",
      title: "E2E Test Plan",
      start_date: "2026-07-01",
      weeks,
      training_age: "intermediate",
    }),
  });
  expect(createRes.status).toBe(202);
  const { task_id } = (await createRes.json()) as { task_id: string };

  // Stub mode completes in <1s; live-LLM mode can take 60-120s
  const maxPolls = LIVE_LLM ? 500 : 20;
  const pollInterval = LIVE_LLM ? 500 : 200;
  for (let i = 0; i < maxPolls; i++) {
    const tr = await fetch(`${API_URL}/api/v1/plans/tasks/${task_id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = (await tr.json()) as { status: string; plan_id?: string };
    if (data.status === "complete" && data.plan_id) return data.plan_id;
    if (data.status === "failed") throw new Error("Plan generation failed");
    await new Promise((r) => setTimeout(r, pollInterval));
  }
  throw new Error("Plan generation timed out");
}

let sharedToken = "";
let sharedPlanId = "";

test.beforeAll(async () => {
  await ensureTestUser();
  if (LIVE_LLM) {
    // Create one shared plan for tests that need a plan_id, avoiding redundant
    // Ollama calls (each call takes 1-3 min; back-to-back calls risk timeouts).
    const res = await fetch(
      `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
      {
        method: "POST",
        headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ email: E2E_EMAIL, password: E2E_PASSWORD }),
      },
    );
    const session = (await res.json()) as { access_token: string };
    sharedToken = session.access_token;
    sharedPlanId = await createPlanAndWait(sharedToken);
  }
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
  const planId = LIVE_LLM ? sharedPlanId : await createPlanAndWait(token);

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
  const planId = LIVE_LLM ? sharedPlanId : await createPlanAndWait(token);

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

test.describe("plan revision", () => {
  test("revise plan API returns updated plan detail", async ({ page }) => {
    const token = await loginAndSetSession(page);
    const planId = LIVE_LLM ? sharedPlanId : await createPlanAndWait(token);

    const res = await fetch(`${API_URL}/api/v1/plans/${planId}/revise`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        feedback: "My knees have been bothering me — reduce squat volume.",
      }),
    });
    expect(res.status).toBe(200);
    const plan = (await res.json()) as Record<string, unknown>;
    expect(plan["id"]).toBe(planId);
    expect(Array.isArray(plan["sessions"])).toBe(true);
    expect(Array.isArray(plan["mesocycles"])).toBe(true);
  });

  test("revise plan rejects short feedback", async ({ page }) => {
    const token = await loginAndSetSession(page);
    const planId = LIVE_LLM ? sharedPlanId : await createPlanAndWait(token);

    const res = await fetch(`${API_URL}/api/v1/plans/${planId}/revise`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ feedback: "hi" }),
    });
    expect(res.status).toBe(422);
  });

  test("revise plan shows form in UI", async ({ page }) => {
    const token = await loginAndSetSession(page);
    const planId = LIVE_LLM ? sharedPlanId : await createPlanAndWait(token);

    await page.goto(`http://localhost:3000/plans/${planId}`);
    await expect(
      page.locator('[data-testid="revision-feedback-input"]'),
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.locator('[data-testid="revise-plan-submit"]'),
    ).toBeVisible();
    // Submit button disabled until feedback is long enough
    await expect(
      page.locator('[data-testid="revise-plan-submit"]'),
    ).toBeDisabled();
  });

  test("revise plan UI submits and updates plan", async ({ page }) => {
    const token = await loginAndSetSession(page);
    const planId = LIVE_LLM ? sharedPlanId : await createPlanAndWait(token);

    await page.goto(`http://localhost:3000/plans/${planId}`);
    await expect(
      page.locator('[data-testid="revision-feedback-input"]'),
    ).toBeVisible({ timeout: 10000 });

    await page.fill(
      '[data-testid="revision-feedback-input"]',
      "My knees have been bothering me — reduce squat volume please.",
    );
    await expect(
      page.locator('[data-testid="revise-plan-submit"]'),
    ).toBeEnabled();
    await page.click('[data-testid="revise-plan-submit"]');

    // Wait for success indicator or plan to remain visible
    await expect(page.locator('[data-testid="plan-branch-view"]')).toBeVisible({
      timeout: 15000,
    });
    // Feedback textarea should be cleared on success
    await expect(
      page.locator('[data-testid="revision-feedback-input"]'),
    ).toHaveValue("");
  });
});
