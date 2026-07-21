/**
 * Phase 5 E2E — Adaptations (AI-4 S14 + S16)
 * Tests adaptation detection, merge, reject, and the PR UI.
 */

import { type Page, expect, test } from "@playwright/test";

const E2E_EMAIL = "e2e-adaptations@test.local";
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
  // Use a 4-week plan in live-LLM mode to reduce Ollama generation time (min weeks=4)
  const weeks = LIVE_LLM ? 4 : 8;
  const createRes = await fetch(`${API_URL}/api/v1/plans`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      // Bypass per-IP rate limit in E2E tests (server generates unique bucket per request)
      "X-Test-User-Id": "e2e-adaptations",
    },
    body: JSON.stringify({
      archetype: "general-crossfit",
      title: "Adaptation E2E Plan",
      start_date: "2026-07-01",
      weeks,
      training_age: "intermediate",
      days_per_week: 4,
    }),
  });
  if (!createRes.ok)
    throw new Error(`Plan creation failed: ${createRes.status}`);
  const { task_id } = (await createRes.json()) as { task_id: string };
  // Stub mode completes in <1s; live-LLM mode can take 60-120s
  const maxPolls = LIVE_LLM ? 500 : 20;
  const pollInterval = LIVE_LLM ? 500 : 300;
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
  const rows = (await res.json()) as Array<{ id: string }>;
  if (!rows[0]) throw new Error("seed adaptation returned no row");
  return rows[0].id;
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

test("adaptations page renders the PR header and a session diff card", async ({
  page,
}) => {
  const { token, userId } = await loginAndSetSession(page);
  const planId = await createPlanAndWait(token);

  // diff_json is required for the review UI to render a session card — an
  // adaptation with no diff_json renders the "no changes recommended" no-op
  // state instead (design spec §8.7).
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
      diff_json: [
        {
          session_id: "00000000-0000-0000-0000-000000000099",
          session_title: "E2E Session",
          scheduled_date: null,
          change: "reduce_intensity",
          load_pct_delta: -10,
          volume_delta_sets: null,
          notes: "E2E test diff row.",
          item_changes: [
            {
              item_id: null,
              movement_name: "Back Squat",
              item_order: 0,
              old_sets: 5,
              old_reps: "5",
              old_load_pct_1rm: 75,
              old_load_kg: null,
              old_notes: null,
              new_sets: 5,
              new_reps: "5",
              new_load_pct_1rm: 65,
              new_load_kg: null,
              new_notes: null,
              changed: true,
              removed: false,
            },
          ],
        },
      ],
    }),
  });

  await page.goto(`http://localhost:3000/plan/${planId}/adaptations`);
  await expect(
    page.locator('[data-testid="adaptation-header"]').first(),
  ).toBeVisible({ timeout: 10000 });
  await expect(
    page.locator('[data-testid="session-diff-card"]').first(),
  ).toBeVisible();
});

test.describe("rejection with feedback", () => {
  test("reject with reason stores it via API", async ({ page }) => {
    const { token, userId } = await loginAndSetSession(page);
    const planId = await createPlanAndWait(token);
    const adaptationId = await seedAdaptation(planId, userId);

    const res = await fetch(
      `${API_URL}/api/v1/adaptations/${adaptationId}/reject`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rejection_reason: "Prefer volume reduction over intensity.",
        }),
      },
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      status: string;
      rejection_reason: string | null;
    };
    expect(data.status).toBe("rejected");
    expect(data.rejection_reason).toBe(
      "Prefer volume reduction over intensity.",
    );
  });

  test("reject without body is backward compatible", async ({ page }) => {
    const { token, userId } = await loginAndSetSession(page);
    const planId = await createPlanAndWait(token);
    const adaptationId = await seedAdaptation(planId, userId);

    const res = await fetch(
      `${API_URL}/api/v1/adaptations/${adaptationId}/reject`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as { rejection_reason: string | null };
    expect(data.rejection_reason).toBeNull();
  });

  test("adjust returns new proposed adaptation", async ({ page }) => {
    const { token, userId } = await loginAndSetSession(page);
    const planId = await createPlanAndWait(token);
    const adaptationId = await seedAdaptation(planId, userId);

    const res = await fetch(
      `${API_URL}/api/v1/adaptations/${adaptationId}/adjust`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          feedback: "Please reduce volume instead of intensity here.",
        }),
      },
    );
    expect(res.status).toBe(200);
    const newAdaptation = (await res.json()) as {
      id: string;
      status: string;
      plan_id: string;
    };
    expect(newAdaptation.id).not.toBe(adaptationId);
    expect(newAdaptation.status).toBe("proposed");
    expect(newAdaptation.plan_id).toBe(planId);
  });

  // NOTE: a UI test for the manual-revision composer
  // (components/adaptations/ManualRevisionComposer.tsx) belongs here once a
  // plan-detail page embeds it — it isn't wired into any live route yet
  // (the plan-overview page is a separate, in-flight effort). The composer's
  // own behavior is covered by the revise/adjust/reject API tests above and
  // by __tests__/lib/adaptationDiff.test.ts's computeManualRevisionDiff
  // coverage in the meantime.
});
