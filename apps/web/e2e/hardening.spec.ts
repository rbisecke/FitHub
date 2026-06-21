import { type Page, expect, test } from "@playwright/test";

// ── Auth helpers (same pattern as other e2e specs) ─────────────────────────────

const SUPABASE_URL = "http://127.0.0.1:54321";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

const E2E_EMAIL = "e2e-hardening@test.local";
const E2E_PASSWORD = "E2eHardeningFitHub!2026";

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

async function loginAndSetSession(page: Page): Promise<void> {
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
}

// ── Setup ──────────────────────────────────────────────────────────────────────

test.beforeAll(async () => {
  await ensureTestUser();
});

// ── Tests ──────────────────────────────────────────────────────────────────────

test.describe("404 page", () => {
  test("unknown route shows git-themed 404", async ({ page }) => {
    await loginAndSetSession(page);
    await page.goto("/this-does-not-exist");
    await expect(page.getByText(/pathspec not found/i)).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByText(/404/)).toBeVisible();
  });

  test("404 page 'git checkout main' link navigates to dashboard", async ({
    page,
  }) => {
    await loginAndSetSession(page);
    await page.goto("/this-does-not-exist");
    await page.getByRole("link", { name: /git checkout main/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });
});

test.describe("App error boundary", () => {
  test("error.tsx renders when a route throws (dev only)", async ({ page }) => {
    await loginAndSetSession(page);
    // /test-error throws unconditionally in non-production environments.
    // It 404s in production (handled by not-found.tsx instead).
    await page.goto("/test-error");

    // Next.js dev mode may show an overlay — dismiss it if present
    const overlay = page.locator("[data-nextjs-dialog]");
    if (await overlay.isVisible({ timeout: 1000 }).catch(() => false)) {
      await page.keyboard.press("Escape");
    }

    await expect(
      page.getByRole("heading", { name: /merge conflict/i }),
    ).toBeVisible({
      timeout: 8000,
    });
    await expect(
      page.getByRole("button", { name: /git reset/i }),
    ).toBeVisible();
  });
});
