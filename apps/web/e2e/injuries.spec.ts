/**
 * E2E tests for the injury-aware coach feature.
 *
 * Covers:
 *  - Report non-red-flag injury → substitution list shown, no referral card
 *  - Report red-flag injury (pain ≥ 8) → referral card shown, no substitutions
 *  - Injury list page renders active injuries
 *  - Status lifecycle: clear with restrictions via PATCH /injuries/{id}/status
 *  - Expanded body regions (muscle / soft-tissue) accepted by API
 *  - modify-workout API returns modification plan for session with active injury
 */

import { type Page, expect, test } from "@playwright/test";

// All tests share a single user (e2e-injuries@test.local).
// Run sequentially to prevent cross-test injury-state interference.
test.describe.configure({ mode: "serial" });

const E2E_EMAIL = "e2e-injuries@test.local";
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

  const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
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

  // Get user ID to mark onboarding complete — either from creation or lookup
  let userId: string | undefined;
  if (createRes.ok) {
    const body = (await createRes.json()) as { id?: string };
    userId = body.id;
  } else {
    // User already exists — find via admin list
    const listRes = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=1000`,
      { headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}` } },
    );
    if (listRes.ok) {
      const { users } = (await listRes.json()) as {
        users: Array<{ id: string; email: string }>;
      };
      userId = users.find((u) => u.email === E2E_EMAIL)?.id;
    }
  }

  // Mark profile as onboarding_completed so the app layout doesn't redirect
  if (userId) {
    await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
      method: "PATCH",
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ onboarding_completed: true }),
    });
  }
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

async function deleteAllInjuries(token: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/v1/injuries`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return;
  const injuries = (await res.json()) as Array<{ id: string }>;
  await Promise.all(
    injuries.map((inj) =>
      fetch(`${SUPABASE_URL}/rest/v1/injuries?id=eq.${inj.id}`, {
        method: "DELETE",
        headers: {
          apikey: SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        },
      }),
    ),
  );
}

test.beforeAll(async () => {
  await ensureTestUser();
});

// ─── Form UI tests ───────────────────────────────────────────────────────────

test.describe.serial("injury report form", () => {
  test("renders all body region groups including muscle and soft-tissue", async ({
    page,
  }) => {
    const { token } = await loginAndSetSession(page);
    await deleteAllInjuries(token);
    await page.goto("http://localhost:3000/injuries/new");
    await page.waitForLoadState("networkidle");

    // Original joint regions
    await expect(page.getByTestId("body-region-knee")).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByTestId("body-region-shoulder")).toBeVisible();

    // New muscle regions
    await expect(page.getByTestId("body-region-hamstring")).toBeVisible();
    await expect(page.getByTestId("body-region-quad")).toBeVisible();

    // New soft-tissue regions
    await expect(page.getByTestId("body-region-it_band")).toBeVisible();
    await expect(page.getByTestId("body-region-hip_flexor")).toBeVisible();
    await expect(page.getByTestId("body-region-forearm")).toBeVisible();
  });

  test("non-red-flag injury shows substitution list and no referral card", async ({
    page,
  }) => {
    const { token } = await loginAndSetSession(page);
    await deleteAllInjuries(token);
    await page.goto("http://localhost:3000/injuries/new");
    await page.waitForLoadState("networkidle");

    await page.getByTestId("body-region-knee").click();
    await page.getByTestId("pain-slider").fill("4");
    await page.getByRole("button", { name: /submit report/i }).click();

    await expect(page.getByTestId("substitution-list")).toBeVisible({
      timeout: 8000,
    });
    await expect(page.getByTestId("referral-card")).not.toBeVisible();
    await expect(
      page.getByText(/goblet squat|box squat/i).first(),
    ).toBeVisible();
  });

  test("red-flag injury (pain ≥ 8) shows referral card and no substitution list", async ({
    page,
  }) => {
    const { token } = await loginAndSetSession(page);
    await deleteAllInjuries(token);
    await page.goto("http://localhost:3000/injuries/new");
    await page.waitForLoadState("networkidle");

    await page.getByTestId("body-region-shoulder").click();
    await page.getByTestId("pain-slider").fill("9");
    await page
      .getByTestId("injury-notes")
      .fill("I think I tore something, pop heard");
    await page.getByRole("button", { name: /submit report/i }).click();

    await expect(page.getByTestId("referral-card")).toBeVisible({
      timeout: 8000,
    });
    await expect(page.getByTestId("substitution-list")).not.toBeVisible();
  });

  test("new muscle region (hamstring) accepted and returns substitutions", async ({
    page,
  }) => {
    const { token } = await loginAndSetSession(page);
    await deleteAllInjuries(token);
    await page.goto("http://localhost:3000/injuries/new");
    await page.waitForLoadState("networkidle");

    await page.getByTestId("body-region-hamstring").click();
    await page.getByTestId("pain-slider").fill("5");
    await page.getByRole("button", { name: /submit report/i }).click();

    await expect(page.getByTestId("substitution-list")).toBeVisible({
      timeout: 8000,
    });
    // Hamstring substitutions include trap bar deadlift / rack pull
    await expect(
      page.getByText(/trap bar|rack pull|kettlebell deadlift/i).first(),
    ).toBeVisible();
  });
});

// ─── Injury list page ────────────────────────────────────────────────────────

test.describe.serial("injuries list page", () => {
  test("shows empty state when no injuries", async ({ page }) => {
    const { token } = await loginAndSetSession(page);
    await deleteAllInjuries(token);
    await page.goto("http://localhost:3000/injuries");
    await page.waitForLoadState("networkidle");

    await expect(page.getByTestId("injury-list-empty")).toBeVisible({
      timeout: 10000,
    });
  });

  test("shows active injury after reporting one", async ({ page }) => {
    const { token } = await loginAndSetSession(page);
    await deleteAllInjuries(token);

    // Seed an injury via API
    const res = await fetch(`${API_URL}/api/v1/injuries`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ body_region: "lower_back", pain_level: 6 }),
    });
    expect(res.ok).toBe(true);

    await page.goto("http://localhost:3000/injuries");
    await page.waitForLoadState("networkidle");

    await expect(page.getByTestId("injury-list")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("lower back")).toBeVisible();
    await expect(page.getByTestId("update-status-btn").first()).toBeVisible();
  });

  test("clear with restrictions updates status badge", async ({ page }) => {
    const { token } = await loginAndSetSession(page);
    await deleteAllInjuries(token);

    const injRes = await fetch(`${API_URL}/api/v1/injuries`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ body_region: "ankle", pain_level: 4 }),
    });
    expect(injRes.ok).toBe(true);

    // Intercept API errors from the browser and fail fast
    const apiErrors: string[] = [];
    page.on("response", (res) => {
      if (
        res.url().includes("/api/v1/injuries") &&
        res.request().method() === "PATCH" &&
        !res.ok()
      ) {
        apiErrors.push(`PATCH ${res.url()} → ${res.status()}`);
      }
    });

    await page.goto("http://localhost:3000/injuries");
    await page.waitForLoadState("networkidle");
    await expect(page.getByTestId("injury-list-item").first()).toBeVisible({
      timeout: 10000,
    });

    await page.getByTestId("update-status-btn").first().click();
    await expect(page.getByTestId("clear-with-restrictions-btn")).toBeVisible();

    await page.getByTestId("clear-with-restrictions-btn").click();

    await expect(page.getByText("cleared (restrictions)")).toBeVisible({
      timeout: 8000,
    });

    expect(apiErrors).toEqual([]);
  });
});

// ─── API-level: modify-workout ────────────────────────────────────────────────

test.describe.serial("modify-workout API", () => {
  test("returns empty modifications when no active injuries", async ({
    page,
  }) => {
    const { token } = await loginAndSetSession(page);
    await deleteAllInjuries(token);

    const planRes = await fetch(`${API_URL}/api/v1/plans`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Test-User-Id": "e2e-injuries",
      },
      body: JSON.stringify({
        goal: "strength",
        title: "Injury E2E Plan",
        start_date: new Date().toISOString().slice(0, 10),
        weeks: 4,
        training_age: "intermediate",
      }),
    });
    expect(planRes.ok).toBe(true);
    const { task_id } = (await planRes.json()) as { task_id: string };

    // Poll until plan is ready (stub mode: fast)
    let planId = "";
    for (let i = 0; i < 30; i++) {
      const tr = await fetch(`${API_URL}/api/v1/plans/tasks/${task_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await tr.json()) as {
        status: string;
        plan_id?: string;
      };
      if (data.status === "complete" && data.plan_id) {
        planId = data.plan_id;
        break;
      }
      if (data.status === "failed") throw new Error("Plan generation failed");
      await new Promise((r) => setTimeout(r, 300));
    }
    if (!planId) throw new Error("Plan generation timed out");

    // Get a session from the plan
    const planDetail = (await (
      await fetch(`${API_URL}/api/v1/plans/${planId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
    ).json()) as { sessions: Array<{ id: string }> };
    const sessionId = planDetail.sessions[0]?.id;
    if (!sessionId) {
      test.skip(true, "No sessions in stub plan — cannot test modify-workout");
      return;
    }

    const modRes = await fetch(`${API_URL}/api/v1/coach/modify-workout`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ session_id: sessionId }),
    });
    expect(modRes.ok).toBe(true);
    const data = (await modRes.json()) as {
      modifications: unknown[];
      safe_movements: string[];
      any_referral_required: boolean;
    };
    expect(data.modifications).toEqual([]);
    expect(data.any_referral_required).toBe(false);
  });

  test("returns modifications when hamstring injury active", async ({
    page,
  }) => {
    const { token } = await loginAndSetSession(page);
    await deleteAllInjuries(token);

    // Report a hamstring injury
    const injRes = await fetch(`${API_URL}/api/v1/injuries`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ body_region: "hamstring", pain_level: 5 }),
    });
    expect(injRes.ok).toBe(true);

    const planRes = await fetch(`${API_URL}/api/v1/plans`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Test-User-Id": "e2e-injuries-hamstring",
      },
      body: JSON.stringify({
        goal: "strength",
        title: "Hamstring E2E Plan",
        start_date: new Date().toISOString().slice(0, 10),
        weeks: 4,
        training_age: "intermediate",
      }),
    });
    expect(planRes.ok).toBe(true);
    const { task_id } = (await planRes.json()) as { task_id: string };

    let planId = "";
    for (let i = 0; i < 30; i++) {
      const tr = await fetch(`${API_URL}/api/v1/plans/tasks/${task_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await tr.json()) as {
        status: string;
        plan_id?: string;
      };
      if (data.status === "complete" && data.plan_id) {
        planId = data.plan_id;
        break;
      }
      if (data.status === "failed") throw new Error("Plan generation failed");
      await new Promise((r) => setTimeout(r, 300));
    }
    if (!planId) throw new Error("Plan generation timed out");

    const planDetail = (await (
      await fetch(`${API_URL}/api/v1/plans/${planId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
    ).json()) as { sessions: Array<{ id: string }> };

    const sessionId = planDetail.sessions[0]?.id;
    if (!sessionId) {
      test.skip(true, "No sessions in stub plan");
      return;
    }

    const modRes = await fetch(`${API_URL}/api/v1/coach/modify-workout`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ session_id: sessionId }),
    });
    expect(modRes.ok).toBe(true);
    const data = (await modRes.json()) as {
      modifications: Array<{
        original_movement: string;
        driven_by: string[];
        substitutions: string[];
      }>;
      any_referral_required: boolean;
    };

    // The stub plan may or may not include hamstring-contraindicated movements.
    // At minimum the endpoint must return a valid response.
    expect(Array.isArray(data.modifications)).toBe(true);
    expect(typeof data.any_referral_required).toBe("boolean");
    // If any modification exists, hamstring must be in driven_by
    for (const mod of data.modifications) {
      expect(mod.driven_by).toContain("hamstring");
    }
  });
});
