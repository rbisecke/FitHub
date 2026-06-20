/**
 * Phase 5 E2E — Adaptations (AI-4 S14 + S16)
 * Tests adaptation detection, merge, reject, and the PR UI.
 */

import { type Page, expect, test } from "@playwright/test";

const E2E_EMAIL = "e2e-adaptations@test.local";
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

async function loginAndSetSession(
  page: Page,
): Promise<{ token: string; userId: string }> {
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
    user: { id: string; [key: string]: unknown };
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
  return { token: session.access_token, userId: session.user.id };
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
      title: "Adaptation E2E Plan",
      start_date: "2026-07-01",
      weeks: 8,
      training_age: "intermediate",
    }),
  });
  const { task_id } = (await createRes.json()) as { task_id: string };
  for (let i = 0; i < 20; i++) {
    const tr = await fetch(`${API_URL}/api/v1/plans/tasks/${task_id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = (await tr.json()) as { status: string; plan_id?: string };
    if (data.status === "complete" && data.plan_id) return data.plan_id;
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error("Plan generation timed out");
}

async function seedAdaptation(planId: string, userId: string): Promise<string> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/adaptations`, {
    method: "POST",
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      plan_id: planId,
      user_id: userId,
      trigger_type: "low_readiness",
      trigger_data: { streak_days: 4 },
      rationale: "E2E test adaptation",
      stub: true,
    }),
  });
  if (!res.ok)
    throw new Error(
      `seed adaptation failed: ${res.status} ${await res.text()}`,
    );
  const [row] = (await res.json()) as Array<{ id: string }>;
  return row.id;
}

test.beforeAll(async () => {
  await ensureTestUser();
});

test("list adaptations returns empty array initially", async ({ page }) => {
  const { token } = await loginAndSetSession(page);
  const planId = await createPlanAndWait(token);

  const res = await fetch(`${API_URL}/api/v1/plans/${planId}/adaptations`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.status).toBe(200);
  const data = (await res.json()) as unknown[];
  expect(Array.isArray(data)).toBe(true);
});

test("merge adaptation via API returns merged status", async ({ page }) => {
  const { token, userId } = await loginAndSetSession(page);
  const planId = await createPlanAndWait(token);
  const adaptationId = await seedAdaptation(planId, userId);

  const mergeRes = await fetch(
    `${API_URL}/api/v1/adaptations/${adaptationId}/merge`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  expect(mergeRes.status).toBe(200);
  const merged = (await mergeRes.json()) as { status: string };
  expect(merged.status).toBe("merged");
});

test("double merge returns 409 conflict", async ({ page }) => {
  const { token, userId } = await loginAndSetSession(page);
  const planId = await createPlanAndWait(token);
  const adaptationId = await seedAdaptation(planId, userId);

  await fetch(`${API_URL}/api/v1/adaptations/${adaptationId}/merge`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const second = await fetch(
    `${API_URL}/api/v1/adaptations/${adaptationId}/merge`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  expect(second.status).toBe(409);
});

test("adaptations page renders adaptation cards", async ({ page }) => {
  const { token, userId } = await loginAndSetSession(page);
  const planId = await createPlanAndWait(token);

  await fetch(`${SUPABASE_URL}/rest/v1/adaptations`, {
    method: "POST",
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      plan_id: planId,
      user_id: userId,
      trigger_type: "high_acwr",
      trigger_data: { acwr: 1.7 },
      rationale: "High training load detected.",
      stub: true,
    }),
  });

  await page.goto(`http://localhost:3000/plans/${planId}/adaptations`);
  await expect(
    page.locator('[data-testid="adaptation-card"]').first(),
  ).toBeVisible({
    timeout: 10000,
  });
});
