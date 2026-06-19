/**
 * Full magic-link E2E test.
 *
 * Flow:
 *   1. Ensure e2e test user exists (admin API, idempotent).
 *   2. Navigate to /login and submit the email form.
 *   3. Poll Mailpit until the sign-in email arrives.
 *   4. Extract the magic link from the email body.
 *   5. Follow the link — Supabase verifies it, redirects through /auth/callback,
 *      Next.js exchanges the code for a session, and redirects to /dashboard.
 *   6. Assert /dashboard is reached and shows the user's email.
 *   7. Hit the FastAPI with the session JWT and assert a real 200 from /me.
 *
 * Requirements:
 *   - supabase start (local stack on default ports)
 *   - alembic upgrade head
 *   - PYTHONPATH=apps/api uvicorn app.main:app running on :8001
 *     (or set E2E_API_URL env var)
 *
 * The test seeds the user via the Supabase Admin API so it is idempotent and
 * does not depend on prior manual setup.
 */

import { expect, test } from "@playwright/test";

// ── Configuration ─────────────────────────────────────────────────────────────

const E2E_EMAIL = "e2e@test.local";
const SUPABASE_URL = "http://127.0.0.1:54321";
const MAILPIT_URL = "http://127.0.0.1:54324";
const API_URL = process.env.E2E_API_URL ?? "http://127.0.0.1:8001";
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Ensure the e2e user exists in both invited_emails and auth.users. */
async function ensureE2EUser(): Promise<void> {
  // Add to invite list (idempotent).
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

  // Create user with email pre-confirmed (idempotent — 422 if exists, ignored).
  await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email: E2E_EMAIL, email_confirm: true }),
  });
}

/** Delete all messages in Mailpit to start with a clean inbox. */
async function clearMailpit(): Promise<void> {
  // Fetch all message IDs then bulk-delete.
  const res = await fetch(`${MAILPIT_URL}/api/v1/messages`);
  const data = (await res.json()) as { messages?: { ID: string }[] };
  const ids = (data.messages ?? []).map((m) => m.ID);
  if (ids.length === 0) return;
  await fetch(`${MAILPIT_URL}/api/v1/messages`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ IDs: ids }),
  });
}

/** Poll Mailpit until a message arrives for E2E_EMAIL, return the text body. */
async function waitForEmail(timeoutMs = 10_000): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await fetch(`${MAILPIT_URL}/api/v1/messages`);
    const data = (await res.json()) as {
      messages?: { ID: string; To: { Address: string }[] }[];
    };
    const msg = (data.messages ?? []).find((m) =>
      m.To.some((t) => t.Address === E2E_EMAIL),
    );
    if (msg) {
      const detail = await fetch(`${MAILPIT_URL}/api/v1/message/${msg.ID}`);
      const body = (await detail.json()) as { Text: string };
      return body.Text;
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`No email for ${E2E_EMAIL} arrived within ${timeoutMs}ms`);
}

/** Extract the magic-link URL from the Supabase email text body. */
function extractMagicLink(text: string): string {
  // Supabase embeds the URL in parentheses: Sign in ( http://... )
  const match = text.match(/\(\s*(https?:\/\/[^\s)]+)\s*\)/);
  if (!match?.[1])
    throw new Error(`Could not find magic link in email:\n${text}`);
  return match[1];
}

// ── Test ──────────────────────────────────────────────────────────────────────

test.describe("Magic-link full E2E", () => {
  test.beforeEach(async () => {
    await ensureE2EUser();
    await clearMailpit();
  });

  test("login → email → callback → dashboard → FastAPI /me", async ({
    page,
  }) => {
    // ── Step 1: navigate to login page ────────────────────────────────────────
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "FitHub" })).toBeVisible();

    // ── Step 2: submit the magic-link form ────────────────────────────────────
    await page.locator('input[type="email"]').fill(E2E_EMAIL);
    await page.getByRole("button", { name: /send magic link/i }).click();

    // Confirmation state: form replaced by "Check your email" message.
    await expect(page.getByText("Check your email")).toBeVisible({
      timeout: 5_000,
    });

    // ── Step 3: fetch the email from Mailpit ──────────────────────────────────
    const emailText = await waitForEmail(10_000);
    expect(emailText).toContain("sign in");

    // ── Step 4: extract the magic link ───────────────────────────────────────
    // site_url in supabase/config.toml is "http://localhost:3000", which matches
    // Playwright's baseURL — no host rewriting needed.
    const magicLink = extractMagicLink(emailText);

    // ── Step 5: follow the magic link ─────────────────────────────────────────
    // Supabase /auth/v1/verify → redirects to /auth/callback?code=... →
    // Next.js route handler exchanges code → redirects to /dashboard.
    await page.goto(magicLink);

    // ── Step 6: assert /dashboard reached ────────────────────────────────────
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
    await expect(
      page.getByRole("heading", { name: "Dashboard" }),
    ).toBeVisible();
    await expect(page.getByText(E2E_EMAIL)).toBeVisible();

    // ── Step 7: call FastAPI /me with the real session JWT ────────────────────
    // @supabase/ssr stores the session in cookies named sb-<ref>-auth-token.
    // For local dev the ref is "localhost".  Values are base64url-encoded JSON
    // (prefixed with "base64-") or, for larger sessions, split into numbered
    // chunks (sb-localhost-auth-token.0, .1, …).
    let jwt: string | null = null;
    {
      const cookies = await page.context().cookies();
      const authCookies = cookies
        .filter((c) => c.name.includes("auth-token"))
        .sort((a, b) => a.name.localeCompare(b.name));
      if (authCookies.length > 0) {
        // Join chunk values (no separator — @supabase/ssr splits at exact byte boundary).
        const raw = authCookies.map((c) => c.value).join("");
        // Strip the "base64-" prefix written by @supabase/ssr, then decode.
        const encoded = raw.startsWith("base64-") ? raw.slice(7) : raw;
        try {
          const decoded = Buffer.from(encoded, "base64url").toString("utf-8");
          const parsed = JSON.parse(decoded) as { access_token?: string };
          jwt = parsed.access_token ?? null;
        } catch {
          // Decoding/parsing failed — jwt stays null and the assertion below will fail with context.
        }
      }
    }

    expect(
      jwt,
      "Expected a JWT to be present in the browser session",
    ).toBeTruthy();

    // Call the running FastAPI with the real JWT.
    const apiRes = await page.evaluate(
      async ({ apiUrl, token }: { apiUrl: string; token: string }) => {
        const r = await fetch(`${apiUrl}/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        return { status: r.status, body: await r.json() };
      },
      { apiUrl: API_URL, token: jwt! },
    );

    expect(apiRes.status).toBe(200);
    expect(apiRes.body).toHaveProperty("user_id");
    // The user_id returned by FastAPI must not be empty.
    expect((apiRes.body as { user_id: string }).user_id).toMatch(
      /^[0-9a-f-]{36}$/,
    );
  });
});
