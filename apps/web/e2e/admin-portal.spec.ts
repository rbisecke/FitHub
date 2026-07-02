/**
 * E2E tests for the admin portal.
 *
 * Auth injection strategy:
 *   1. Call Supabase admin API to generate a magic link for the admin test user.
 *   2. Extract the refresh_token from the redirect URL hash.
 *   3. Exchange it for a full session via POST /auth/v1/token?grant_type=refresh_token.
 *   4. Inject the session as @supabase/ssr chunked base64 cookies directly, bypassing
 *      the email flow entirely.
 *
 * Requirements:
 *   - supabase start + alembic upgrade head
 *   - API running on :8000 with ADMIN_USER_IDS_CSV=b5ad9d98-...
 *   - Next.js dev server on :3000 with ADMIN_USER_IDS=b5ad9d98-...
 *   - Seed data: uv run --directory apps/api python scripts/seed_admin_data.py
 */

import { expect, test, type Page, type BrowserContext } from "@playwright/test";

// ── Constants ────────────────────────────────────────────────────────────────

const ADMIN_EMAIL = "e2e-qa@test.local";
const SUPABASE_URL = "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

// ── Session injection helper ──────────────────────────────────────────────────

async function injectAdminSession(
  context: BrowserContext,
  page: Page,
): Promise<void> {
  // 1. Generate magic link via admin generate_link endpoint
  const magicRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ type: "magiclink", email: ADMIN_EMAIL }),
  });

  if (!magicRes.ok) {
    throw new Error(`Magic link request failed: ${magicRes.status}`);
  }

  const { action_link } = (await magicRes.json()) as { action_link: string };

  // 2. Follow the link (with redirect tracking disabled so we capture the hash)
  const redirectPage = await context.newPage();
  const finalUrlPromise = new Promise<string>((resolve) => {
    redirectPage.on("framenavigated", (frame) => {
      if (frame === redirectPage.mainFrame()) {
        const url = frame.url();
        if (url.includes("access_token") || url.includes("refresh_token")) {
          resolve(url);
        }
      }
    });
  });

  // Navigate to the action link — Supabase will redirect with token in hash
  await redirectPage.goto(action_link, { waitUntil: "commit" });

  let finalUrl: string;
  try {
    finalUrl = await Promise.race([
      finalUrlPromise,
      new Promise<string>((_, reject) =>
        setTimeout(
          () => reject(new Error("Timeout waiting for token URL")),
          5000,
        ),
      ),
    ]);
  } catch {
    // Fallback: grab whatever URL we ended up at
    finalUrl = redirectPage.url();
  }
  await redirectPage.close();

  // 3. Extract refresh_token from the URL hash
  const hashPart = finalUrl.includes("#") ? finalUrl.split("#")[1] : "";
  const hashParams = new URLSearchParams(hashPart);
  const refreshToken = hashParams.get("refresh_token");

  if (!refreshToken) {
    throw new Error(`No refresh_token found in: ${finalUrl}`);
  }

  // 4. Exchange refresh_token for a full session
  const tokenRes = await fetch(
    `${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,
    {
      method: "POST",
      headers: {
        apikey: SERVICE_ROLE_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    },
  );

  if (!tokenRes.ok) {
    throw new Error(`Token exchange failed: ${tokenRes.status}`);
  }

  const session = await tokenRes.json();

  // 5. Encode as @supabase/ssr base64-chunked cookies
  const sessionJson = JSON.stringify(session);
  const encoded = "base64-" + Buffer.from(sessionJson).toString("base64");

  const CHUNK_SIZE = 3180;
  const chunks: string[] = [];
  for (let i = 0; i < encoded.length; i += CHUNK_SIZE) {
    chunks.push(encoded.slice(i, i + CHUNK_SIZE));
  }

  const COOKIE_NAME = "sb-localhost-auth-token";
  const cookieBase = {
    domain: "localhost",
    path: "/",
    secure: false,
    httpOnly: false,
    sameSite: "Lax" as const,
    expires: Math.floor(Date.now() / 1000) + 3600,
  };

  if (chunks.length === 1) {
    await context.addCookies([
      { ...cookieBase, name: COOKIE_NAME, value: chunks[0] },
    ]);
  } else {
    await context.addCookies([
      { ...cookieBase, name: COOKIE_NAME, value: chunks[0] },
      ...chunks.slice(1).map((chunk, i) => ({
        ...cookieBase,
        name: `${COOKIE_NAME}.${i + 1}`,
        value: chunk,
      })),
    ]);
  }

  // Reload so the middleware picks up the session
  await page.goto("/admin");
  await page.waitForURL(/\/admin/);
}

// ── Auth gate tests (no session) ─────────────────────────────────────────────

test.describe("Admin auth gate", () => {
  test("unauthenticated user is redirected to /login from /admin", async ({
    page,
  }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/);
  });

  test("unauthenticated user is redirected to /login from /admin/access", async ({
    page,
  }) => {
    await page.goto("/admin/access");
    await expect(page).toHaveURL(/\/login/);
  });

  test("unauthenticated user is redirected to /login from /admin/users", async ({
    page,
  }) => {
    await page.goto("/admin/users");
    await expect(page).toHaveURL(/\/login/);
  });

  test("unauthenticated user is redirected to /login from /admin/health", async ({
    page,
  }) => {
    await page.goto("/admin/health");
    await expect(page).toHaveURL(/\/login/);
  });
});

// ── Authenticated admin tests ─────────────────────────────────────────────────

test.describe("Admin portal — authenticated", () => {
  // Serial mode: parallel workers each generate a fresh magic link, which
  // invalidates the previous one (Supabase OTPs are single-use). Running
  // serially ensures only one session injection happens at a time.
  test.describe.configure({ mode: "serial" });
  test.beforeEach(async ({ page, context }) => {
    await injectAdminSession(context, page);
  });

  test("renders admin sidebar with all nav links", async ({ page }) => {
    await expect(
      page.getByRole("navigation").getByText("Metrics"),
    ).toBeVisible();
    await expect(
      page.getByRole("navigation").getByText("Access"),
    ).toBeVisible();
    await expect(page.getByRole("navigation").getByText("Users")).toBeVisible();
    await expect(
      page.getByRole("navigation").getByText("Health"),
    ).toBeVisible();
  });

  test("sidebar shows admin badge and logged-in email", async ({ page }) => {
    // Scope to the aside — "admin" badge also appears in the top header
    await expect(page.locator("aside").getByText("admin")).toBeVisible();
    await expect(page.locator("aside").getByText(ADMIN_EMAIL)).toBeVisible();
  });

  // Metrics page
  test.describe("/admin — Metrics", () => {
    test("renders Metrics heading", async ({ page }) => {
      await expect(
        page.getByRole("heading", { name: /^metrics$/i }),
      ).toBeVisible();
    });

    test("renders cost stat card", async ({ page }) => {
      await expect(page.getByText(/cost \(30d\)/i)).toBeVisible();
    });

    test("renders interactions stat card", async ({ page }) => {
      await expect(page.getByText(/interactions \(30d\)/i)).toBeVisible();
    });

    test("renders TTFT stat card", async ({ page }) => {
      await expect(page.getByText(/ttft p50/i)).toBeVisible();
    });

    test("renders cache hit rate stat card", async ({ page }) => {
      // Text appears in both MetricsCard label and RagDonut heading
      await expect(page.getByText(/cache hit rate/i).first()).toBeVisible();
    });
  });

  // Access requests page
  test.describe("/admin/access — Access Requests", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/admin/access");
      await page.waitForURL(/\/admin\/access/);
    });

    test("renders Access Requests heading", async ({ page }) => {
      await expect(
        page.getByRole("heading", { name: /access requests/i }),
      ).toBeVisible();
    });

    test("renders pending/approved/rejected tab bar", async ({ page }) => {
      await expect(
        page.getByRole("button", { name: /pending/i }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: /approved/i }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: /rejected/i }),
      ).toBeVisible();
    });

    test("pending tab shows request cards with Approve and Reject buttons", async ({
      page,
    }) => {
      // Pending is the default tab; seed has 4 pending requests
      await expect(
        page.getByRole("button", { name: /^approve$/i }).first(),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: /^reject$/i }).first(),
      ).toBeVisible();
    });

    test("switching to Approved tab shows approved requests", async ({
      page,
    }) => {
      await page.getByRole("button", { name: /approved/i }).click();
      await expect(page.getByText(/✓ invite sent/).first()).toBeVisible();
    });

    test("switching to Rejected tab shows rejected requests", async ({
      page,
    }) => {
      await page.getByRole("button", { name: /rejected/i }).click();
      await expect(page.getByText(/— dismissed/)).toBeVisible();
    });
  });

  // Users page
  test.describe("/admin/users — Users", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/admin/users");
      await page.waitForURL(/\/admin\/users/);
    });

    test("renders Users heading", async ({ page }) => {
      await expect(
        page.getByRole("heading", { name: /^users$/i }),
      ).toBeVisible();
    });

    test("shows at least one user row with an email", async ({ page }) => {
      await expect(page.getByText(/@test\.local/)).toBeVisible();
    });
  });

  // Health page
  test.describe("/admin/health — Health", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/admin/health");
      await page.waitForURL(/\/admin\/health/);
    });

    test("renders Health heading", async ({ page }) => {
      await expect(
        page.getByRole("heading", { name: /^health$/i }),
      ).toBeVisible();
    });

    test("shows uptime information", async ({ page }) => {
      // "Uptime" label inside UptimeStat card; use exact to avoid matching the page subtitle
      await expect(page.getByText("Uptime", { exact: true })).toBeVisible();
    });
  });

  // Sidebar navigation
  test("sidebar nav links navigate between admin pages", async ({ page }) => {
    await page.getByRole("navigation").getByText("Access").click();
    await expect(page).toHaveURL(/\/admin\/access/);

    await page.getByRole("navigation").getByText("Users").click();
    await expect(page).toHaveURL(/\/admin\/users/);

    await page.getByRole("navigation").getByText("Health").click();
    await expect(page).toHaveURL(/\/admin\/health/);

    await page.getByRole("navigation").getByText("Metrics").click();
    await expect(page).toHaveURL(/\/admin$/);
  });
});
