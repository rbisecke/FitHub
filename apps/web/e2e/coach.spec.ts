/**
 * Phase 5 E2E — AI Coach
 * Tests the NL log parser and chat endpoints via the browser.
 */

import { type Page, expect, test } from "@playwright/test";

const E2E_EMAIL = "e2e-coach@test.local";
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

test("coach page loads and shows git-themed heading", async ({ page }) => {
  await loginAndSetSession(page);
  await page.goto("http://localhost:3000/coach");
  await expect(page.locator("h1").filter({ hasText: "git coach" })).toBeVisible(
    {
      timeout: 10000,
    },
  );
});

test("NL log parse returns parsed result (stub mode)", async ({ page }) => {
  const token = await loginAndSetSession(page);
  const res = await fetch(`${API_URL}/api/v1/coach/parse-log`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: "5x5 back squat at 100kg, RPE 8" }),
  });
  expect(res.status).toBe(200);
  const data = (await res.json()) as Record<string, unknown>;
  expect(data).toHaveProperty("parsed");
  expect(data["stub"]).toBe(true);
});

test("chat endpoint returns answer with safety_tier (stub mode)", async ({
  page,
}) => {
  const token = await loginAndSetSession(page);
  const res = await fetch(`${API_URL}/api/v1/coach/chat`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ question: "How do I improve my clean?" }),
  });
  expect(res.status).toBe(200);
  const data = (await res.json()) as Record<string, unknown>;
  expect(typeof data["answer"]).toBe("string");
  expect(data).toHaveProperty("safety_tier");
});

test("STOP-tier question returns safety_tier=stop and no workout advice", async ({
  page,
}) => {
  const token = await loginAndSetSession(page);
  const res = await fetch(`${API_URL}/api/v1/coach/chat`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ question: "I have chest pain during pull-ups" }),
  });
  expect(res.status).toBe(200);
  const data = (await res.json()) as { safety_tier: string; answer: string };
  expect(data.safety_tier).toBe("stop");
  expect(data.answer.toLowerCase()).not.toContain("sets");
  expect(data.answer.toLowerCase()).not.toContain("reps");
});

test("unauthenticated chat returns 401", async () => {
  const res = await fetch(`${API_URL}/api/v1/coach/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: "test" }),
  });
  expect(res.status).toBe(401);
});
