/**
 * Workout-tracker E2E tests.
 *
 * Covers the full Phase 3a feature set:
 *   1. Log a workout via the form → land on the detail page
 *   2. History page displays workouts with git-style short hashes
 *   3. Delete a workout from its detail page
 *   4. Movement autocomplete popover returns matching movements
 *   5. Partner / solo filter chips isolate the correct workouts
 *
 * Requirements (must be running before `pnpm e2e`):
 *   - supabase start
 *   - alembic upgrade head
 *   - FastAPI on http://127.0.0.1:8000  (or set E2E_API_URL)
 *   - Next.js dev server on http://localhost:3000
 *
 * Auth strategy: create a dedicated e2e user via the Supabase admin API with a
 * known password, then obtain a JWT via the password grant and inject it as the
 * @supabase/ssr session cookie — no Mailpit required.
 */

import { type Page, expect, test } from "@playwright/test";

// ── Configuration ─────────────────────────────────────────────────────────────

const E2E_EMAIL = "e2e-workout@test.local";
const E2E_PASSWORD = "E2eTestFitHub!2026";
const SUPABASE_URL = "http://127.0.0.1:54321";
const API_URL = process.env.E2E_API_URL ?? "http://127.0.0.1:8000";

// Local Supabase demo keys — identical on every fresh `supabase start`.
// Safe to commit: they only work against the local stack.
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Create the E2E user with a known password. Returns their access token. */
async function ensureTestUser(): Promise<string> {
  // Add to invite allowlist (idempotent — ignore-duplicates).
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

  // Create the user (422 = already exists — that's fine).
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

/** Get a fresh JWT via the password grant (no browser needed). */
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

/**
 * Obtain a fresh JWT and inject it as the @supabase/ssr session cookie so
 * Next.js server components see an authenticated session.
 *
 * Cookie name: sb-{SUPABASE_URL_hostname}-auth-token
 * Cookie value: "base64-" + base64url(JSON.stringify(session))
 */
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

  // @supabase/ssr v0.12 encodes the session as base64url JSON.
  // NEXT_PUBLIC_SUPABASE_URL = http://localhost:54321 → cookie ref = "localhost"
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

/** POST a workout via FastAPI and return its UUID. */
async function seedWorkout(
  token: string,
  overrides: {
    title?: string;
    performed_at?: string;
    workout_format?: string;
    session_type?: string;
  } = {},
): Promise<string> {
  const res = await fetch(`${API_URL}/api/v1/workouts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      performed_at: overrides.performed_at ?? "2026-06-19T00:00:00Z",
      session_type: overrides.session_type ?? "metcon",
      workout_format: overrides.workout_format ?? "for_time",
      title: overrides.title ?? "E2E Workout",
    }),
  });
  if (!res.ok) throw new Error(`seed workout failed ${res.status}`);
  const data = (await res.json()) as { id: string };
  return data.id;
}

/** DELETE a workout via FastAPI (404 silently ignored). */
async function deleteWorkout(token: string, id: string): Promise<void> {
  await fetch(`${API_URL}/api/v1/workouts/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => {});
}

/** Delete all workouts owned by the E2E user (clean-slate for re-runs). */
async function deleteAllWorkouts(token: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/v1/workouts?limit=100`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return;
  const data = (await res.json()) as { items: { id: string }[] };
  await Promise.all(data.items.map((w) => deleteWorkout(token, w.id)));
}

// ── Test suite ────────────────────────────────────────────────────────────────

test.describe.serial("Workout tracker", () => {
  let token = "";

  test.beforeAll(async () => {
    token = await ensureTestUser();
    // Warm up FastAPI profile (lazy-created on first JWT hit).
    await fetch(`${API_URL}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
    // Delete any workouts left over from previous test runs.
    await deleteAllWorkouts(token);
  });

  test.beforeEach(async ({ page }) => {
    token = await loginAndSetSession(page);
  });

  // ── 1. Log a workout via the form ─────────────────────────────────────────
  test("can log a workout via form and view the detail page", async ({
    page,
  }) => {
    await page.goto("/log/new");
    await expect(
      page.getByRole("heading", { name: /git commit --fit/i }),
    ).toBeVisible();

    // Fill the title; date is pre-populated with today.
    await page.getByLabel("Title").fill("E2E Test: Fran");

    // Submit — no results row required (form allows empty results).
    await page.getByRole("button", { name: "Commit workout" }).click();

    // Should redirect to the detail page.
    await expect(page).toHaveURL(/\/history\/[0-9a-f-]{36}$/, {
      timeout: 10_000,
    });

    // Detail page shows the workout title and a short hash.
    await expect(
      page.getByRole("heading", { name: "E2E Test: Fran" }),
    ).toBeVisible();
    const hashEl = page.locator(".font-mono.text-orange-400").first();
    await expect(hashEl).toHaveText(/^[0-9a-f]{8}$/);

    // Cleanup.
    const id = page.url().split("/").at(-1)!;
    await deleteWorkout(token, id);
  });

  // ── 2. History lists workouts with git commit hashes ─────────────────────
  test("workout history displays workouts with git commit hashes", async ({
    page,
  }) => {
    const id1 = await seedWorkout(token, {
      title: "Hash Test Alpha",
      performed_at: "2026-06-19T00:00:00Z",
    });
    const id2 = await seedWorkout(token, {
      title: "Hash Test Beta",
      performed_at: "2026-06-18T00:00:00Z",
    });

    try {
      await page.goto("/history");

      // Both workout titles must appear.
      await expect(page.getByText("Hash Test Alpha")).toBeVisible({
        timeout: 8_000,
      });
      await expect(page.getByText("Hash Test Beta")).toBeVisible();

      // Every visible workout card must have a 7-character hex short hash.
      const cards = page.getByTestId("workout-card");
      const cardCount = await cards.count();
      expect(cardCount).toBeGreaterThanOrEqual(2);

      for (let i = 0; i < cardCount; i++) {
        const hash = cards.nth(i).locator(".font-mono.text-orange-400").first();
        const text = (await hash.textContent()) ?? "";
        expect(text.trim()).toMatch(/^[0-9a-f]{8}$/);
      }
    } finally {
      await deleteWorkout(token, id1);
      await deleteWorkout(token, id2);
    }
  });

  // ── 3. Delete a workout from its detail page ──────────────────────────────
  test("can delete a workout from its detail page", async ({ page }) => {
    const id = await seedWorkout(token, {
      title: "To Delete",
      performed_at: "2026-06-19T00:00:00Z",
    });

    await page.goto(`/history/${id}`);
    await expect(
      page.getByRole("heading", { name: "To Delete" }),
    ).toBeVisible();

    // Open the delete confirmation dialog.
    await page.getByRole("button", { name: "Delete" }).click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 3_000 });
    await expect(page.getByText("Delete workout?")).toBeVisible();

    // Confirm deletion → redirects to /history.
    await page.getByRole("button", { name: "Confirm" }).click();
    await expect(page).toHaveURL(/\/history$/, { timeout: 10_000 });

    // The deleted workout title must no longer appear in the history list.
    await expect(page.getByText("To Delete")).not.toBeVisible();
  });

  // ── 4. Movement autocomplete search ──────────────────────────────────────
  test("movement autocomplete shows matching results when typing", async ({
    page,
  }) => {
    // Seed a movement with all required fields.
    // 409/422 = already exists from a prior run — that's fine.
    const mvRes = await fetch(`${API_URL}/api/v1/movements`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "E2E Kettlebell Swing",
        slug: "e2e-kettlebell-swing",
        base_movement: "Kettlebell Swing",
        modality: "gymnastics",
      }),
    });
    if (!mvRes.ok && mvRes.status !== 422 && mvRes.status !== 409) {
      throw new Error(`seed movement failed: ${mvRes.status}`);
    }

    await page.goto("/log/new");

    // Add a result row so the MovementSearch trigger is rendered.
    await page.getByRole("button", { name: "+ Add set" }).click();

    // Click the trigger button to open the popover.
    await page.getByRole("button", { name: "Search movement" }).click();

    // The CommandInput is in a popover portal — locate by placeholder.
    const commandInput = page.getByPlaceholder("Search movements…");
    await expect(commandInput).toBeVisible({ timeout: 2_000 });
    await commandInput.fill("E2E Kett");

    // Results appear after the 300 ms debounce.
    await expect(page.getByText("E2E Kettlebell Swing")).toBeVisible({
      timeout: 3_000,
    });
  });

  // ── 5. Partner / solo filter chips ───────────────────────────────────────
  test("partner and solo filter chips isolate the correct workouts", async ({
    page,
  }) => {
    const soloId = await seedWorkout(token, {
      title: "Solo WOD",
      performed_at: "2026-06-19T00:00:00Z",
      workout_format: "for_time",
    });
    const partnerId = await seedWorkout(token, {
      title: "Partner WOD",
      performed_at: "2026-06-18T00:00:00Z",
      workout_format: "partner",
    });

    try {
      await page.goto("/history");

      // Both workouts are visible with the default "all" filter.
      await expect(page.getByText("Solo WOD")).toBeVisible({ timeout: 8_000 });
      await expect(page.getByText("Partner WOD")).toBeVisible();

      // ── "partner" filter shows only Partner WOD ───────────────────────────
      await page.getByRole("button", { name: "partner" }).click();
      await expect(page).toHaveURL(/filter=partner/);
      await expect(page.getByText("Partner WOD")).toBeVisible();
      await expect(page.getByText("Solo WOD")).not.toBeVisible();

      // ── "solo" filter shows only Solo WOD ────────────────────────────────
      await page.getByRole("button", { name: "solo" }).click();
      await expect(page).toHaveURL(/filter=solo/);
      await expect(page.getByText("Solo WOD")).toBeVisible();
      await expect(page.getByText("Partner WOD")).not.toBeVisible();

      // ── "all" resets to showing both ─────────────────────────────────────
      await page.getByRole("button", { name: "all" }).click();
      await expect(page).toHaveURL(/\/history$/);
      await expect(page.getByText("Solo WOD")).toBeVisible();
      await expect(page.getByText("Partner WOD")).toBeVisible();
    } finally {
      await deleteWorkout(token, soloId);
      await deleteWorkout(token, partnerId);
    }
  });
});
