/**
 * Phase 5 E2E — Integrations + Injury Report (AI-2 + AI-4 S15/S16)
 * Tests injury reporting and substitution display.
 */

import { type Page, expect, test } from "@playwright/test";

const E2E_EMAIL = "e2e-integrations@test.local";
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

test.beforeAll(async () => {
  await ensureTestUser();
});

test("integrations page loads", async ({ page }) => {
  await loginAndSetSession(page);
  await page.goto("http://localhost:3000/integrations");
  await expect(page.locator("body")).toBeVisible({ timeout: 10000 });
});

test("injury report API — no red flags returns requires_referral=false", async ({
  page,
}) => {
  const token = await loginAndSetSession(page);
  const res = await fetch(`${API_URL}/api/v1/injuries`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      body_region: "knee",
      pain_level: 4,
      mechanism: "overuse",
      notes: "aches after squats",
    }),
  });
  expect(res.status).toBe(200);
  const data = (await res.json()) as {
    requires_referral: boolean;
    substitutions: string[];
  };
  expect(data.requires_referral).toBe(false);
  expect(Array.isArray(data.substitutions)).toBe(true);
});

test("injury report API — pain 9 returns requires_referral=true", async ({
  page,
}) => {
  const token = await loginAndSetSession(page);
  const res = await fetch(`${API_URL}/api/v1/injuries`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ body_region: "shoulder", pain_level: 9 }),
  });
  expect(res.status).toBe(200);
  const data = (await res.json()) as {
    requires_referral: boolean;
    substitutions: string[];
  };
  expect(data.requires_referral).toBe(true);
  expect(data.substitutions).toEqual([]);
});

test("injury report page renders form elements", async ({ page }) => {
  await loginAndSetSession(page);
  await page.goto("http://localhost:3000/injuries/new");
  await expect(page.locator('[data-testid="pain-slider"]')).toBeVisible({
    timeout: 10000,
  });
  await expect(page.locator('[data-testid="body-region-knee"]')).toBeVisible();
});

test("injury list returns previously reported injuries", async ({ page }) => {
  const token = await loginAndSetSession(page);
  await fetch(`${API_URL}/api/v1/injuries`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ body_region: "wrist", pain_level: 3 }),
  });

  const listRes = await fetch(`${API_URL}/api/v1/injuries`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(listRes.status).toBe(200);
  const injuries = (await listRes.json()) as unknown[];
  expect(injuries.length).toBeGreaterThan(0);
});

test("unauthenticated injury report returns 401", async () => {
  const res = await fetch(`${API_URL}/api/v1/injuries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body_region: "knee", pain_level: 3 }),
  });
  expect(res.status).toBe(401);
});
