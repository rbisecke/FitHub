/**
 * Phase 4 E2E: Analytics page, ACWR widget, PR badges.
 *
 * Prerequisites:
 *   - Next.js on http://localhost:3000
 *   - FastAPI on http://127.0.0.1:8000
 *   - Supabase local on http://127.0.0.1:54321
 */

import { test, expect, type Page } from "@playwright/test";

const E2E_EMAIL = "e2e-workout@test.local";
const E2E_PASSWORD = "E2eTestFitHub!2026";
const SUPABASE_URL = "http://127.0.0.1:54321";
const API_URL = process.env.E2E_API_URL ?? "http://127.0.0.1:8000";

const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

async function ensureTestUser(): Promise<string> {
  // Add to invite allowlist (idempotent).
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
  // Create user (422 = already exists — fine).
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
  return getToken();
}

async function getToken(): Promise<string> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email: E2E_EMAIL, password: E2E_PASSWORD }),
  });
  if (!res.ok) throw new Error(`password grant failed: ${res.status}`);
  const session = (await res.json()) as { access_token: string };
  return session.access_token;
}

async function loginAndSetSession(page: Page): Promise<string> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email: E2E_EMAIL, password: E2E_PASSWORD }),
  });
  if (!res.ok) throw new Error(`loginAndSetSession failed: ${res.status}`);
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

async function deleteAllWorkouts(token: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/v1/workouts?limit=100`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return;
  const data = (await res.json()) as { items: { id: string }[] };
  await Promise.all(
    data.items.map((w) =>
      fetch(`${API_URL}/api/v1/workouts/${w.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {}),
    ),
  );
}

/** Seed a workout that contributes perceived_load_au (needs session_rpe + duration_s). */
async function seedLoadWorkout(
  token: string,
  daysAgo: number,
  sessionRpe = 6,
  durationMin = 60,
): Promise<string> {
  const dt = new Date();
  dt.setDate(dt.getDate() - daysAgo);
  const performed_at = dt.toISOString().slice(0, 10) + "T12:00:00Z";
  const res = await fetch(`${API_URL}/api/v1/workouts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      performed_at,
      session_type: daysAgo % 3 === 0 ? "metcon" : "strength",
      session_rpe: sessionRpe,
      duration_s: durationMin * 60,
      title: `Seed Load ${daysAgo}`,
    }),
  });
  if (!res.ok) throw new Error(`seedLoadWorkout failed ${res.status}`);
  const data = (await res.json()) as { id: string };
  return data.id;
}

test.describe.serial("Analytics", () => {
  let token = "";

  test.beforeAll(async () => {
    token = await ensureTestUser();
    // Warm up FastAPI profile
    await fetch(`${API_URL}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  });

  test("empty state shown when < 7 days of data", async ({ page }) => {
    token = await loginAndSetSession(page);
    await deleteAllWorkouts(token);

    await page.goto("/analytics");
    await expect(page.getByTestId("empty-analytics-state")).toBeVisible();
  });

  test("analytics page renders charts with seeded data", async ({ page }) => {
    token = await loginAndSetSession(page);
    // Seed 10 workouts across the last 10 days
    for (let i = 0; i < 10; i++) {
      await seedLoadWorkout(token, i, 6 + (i % 3), 45 + i * 5);
    }

    await page.goto("/analytics");
    await page.waitForFunction(
      () => document.querySelector("[data-testid='acwr-chart']") !== null,
      { timeout: 10000 },
    );
    await expect(page.getByTestId("acwr-chart")).toBeVisible();
    await expect(page.getByTestId("fitness-card")).toBeVisible();
    await expect(page.getByTestId("acwr-zone")).toBeVisible();
  });

  test("ACWR zone badge has valid label", async ({ page }) => {
    await loginAndSetSession(page);
    await page.goto("/analytics");
    const badge = page.getByTestId("acwr-zone");
    await expect(badge).toBeVisible();
    const text = await badge.textContent();
    const validLabels = [
      "Optimal load",
      "Room to increase",
      "High load — watch recovery",
      "Reduce intensity",
      "Not enough data yet",
    ];
    expect(validLabels.some((l) => text?.includes(l))).toBe(true);
  });

  test("dashboard shows ACWR widget", async ({ page }) => {
    await loginAndSetSession(page);
    await page.goto("/dashboard");
    await expect(page.getByTestId("dashboard-acwr-widget")).toBeVisible();
  });

  test("dashboard shows training partners panel", async ({ page }) => {
    await loginAndSetSession(page);
    await page.goto("/dashboard");
    await expect(page.getByTestId("training-partners-panel")).toBeVisible();
  });

  test("nav link to analytics is present", async ({ page }) => {
    await loginAndSetSession(page);
    await page.goto("/analytics");
    // Desktop sidebar should have the git diff link
    const link = page.locator("nav").getByText("$ git diff");
    await expect(link).toBeVisible();
  });
});
