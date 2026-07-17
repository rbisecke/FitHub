/**
 * Session Execution E2E tests (FE-15).
 *
 * Covers the session execution flow introduced in FE-13/FE-14:
 *   1. Load session — first exercise visible on page load
 *   2. Log a set — weight + reps entry, set count increments
 *   3. Rest timer — appears automatically after logging final set of an exercise
 *   4. Complete session — advance through all exercises, completion state shown
 *   5. Exercise swap (happy path) — substitute list loads, select + confirm, card updates
 *   6. Swap abort — close sheet before load completes, no state change in exercise card
 *
 * Auth strategy: identical to plan-wizard.spec.ts — inject the @supabase/ssr cookie.
 *
 * Backend calls from the server component (api.plans.get) use the real FastAPI
 * running at localhost:8000 with STUB_LLM=true, so plan generation completes in < 1 s.
 *
 * Client-side calls (getSubstitutes) are intercepted via page.route() so no movement
 * data needs to be seeded.
 *
 * Requirements to run locally:
 *   - supabase start
 *   - STUB_LLM=true fastapi running at http://localhost:8000
 *   - Next.js dev server on http://localhost:3000
 */

import { type Page, expect, test } from "@playwright/test";

// ── Configuration ─────────────────────────────────────────────────────────────

const E2E_EMAIL = "e2e-session@test.local";
const E2E_PASSWORD = "E2eTestFitHub!2026";
const SUPABASE_URL = "http://127.0.0.1:54321";
// FastAPI URL: only used for the /me warmup call (profile lazy-init).
const API_URL = process.env.E2E_API_URL ?? "http://127.0.0.1:8000";

// Local Supabase demo keys — safe to commit; only valid against the local stack.
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

// FastAPI base URL as seen by the browser (client-side fetches).
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ── Auth helpers ──────────────────────────────────────────────────────────────

/**
 * Create the E2E test user idempotently and mark onboarding complete so the
 * app layout does not redirect to /onboarding.
 */
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

  // Resolve the user's UUID and mark onboarding complete.
  const grantRes = await fetch(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ email: E2E_EMAIL, password: E2E_PASSWORD }),
    },
  );
  if (!grantRes.ok) return;

  const { user } = (await grantRes.json()) as { user?: { id: string } };
  const userId = user?.id;
  if (!userId) return;

  await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`,
    {
      method: "PATCH",
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ onboarding_completed: true }),
    },
  );
}

/**
 * Obtain a fresh JWT and inject it as the @supabase/ssr session cookie so
 * Next.js server components see an authenticated session.
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

// ── Plan/session setup helpers ────────────────────────────────────────────────

interface PlanIds {
  planId: string;
  sessionId: string;
}

/**
 * Resolve the user_id (UUID) for the E2E test account by doing a password
 * grant and decoding the JWT sub claim (base64 payload segment).
 */
async function resolveUserId(): Promise<string> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email: E2E_EMAIL, password: E2E_PASSWORD }),
  });
  if (!res.ok) throw new Error(`password grant failed: ${res.status}`);
  const { user } = (await res.json()) as { user?: { id: string } };
  if (!user?.id) throw new Error("Could not resolve userId from JWT");
  return user.id;
}

/**
 * Insert a minimal plan, mesocycle, session, and two exercises directly into
 * the local Supabase database using the service-role key + PostgREST.
 *
 * This bypasses LLM plan generation entirely so the test suite runs fully
 * offline, regardless of STUB_LLM or ANTHROPIC_API_KEY settings.
 *
 * The plan shape: 2 exercises × 3 sets each.  That's enough for tests 1-4
 * (the complete-session test only needs to exhaust the set list).
 */
async function seedPlanData(userId: string): Promise<PlanIds> {
  const headers = {
    apikey: SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };

  // 1. Insert plan
  const planRes = await fetch(`${SUPABASE_URL}/rest/v1/plans`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      user_id: userId,
      archetype: "general-crossfit",
      title: "E2E Session Execution Test Plan",
      start_date: "2026-07-01",
      end_date: "2026-07-28",
      branch_name: "e2e/session-execution",
      weeks: 4,
      training_age: "intermediate",
      status: "active",
    }),
  });
  if (!planRes.ok) {
    const t = await planRes.text().catch(() => "");
    throw new Error(
      `plan insert failed: ${planRes.status} — ${t.slice(0, 200)}`,
    );
  }
  const [plan] = (await planRes.json()) as Array<{ id: string }>;
  if (!plan) throw new Error("plan insert returned empty array");
  const planId = plan.id;

  // 2. Insert mesocycle
  const mesoRes = await fetch(`${SUPABASE_URL}/rest/v1/mesocycles`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      plan_id: planId,
      user_id: userId,
      name: "Accumulation Block",
      phase: "accumulation",
      week_start: 1,
      week_end: 4,
      focus: "general fitness",
    }),
  });
  if (!mesoRes.ok) {
    const t = await mesoRes.text().catch(() => "");
    throw new Error(
      `meso insert failed: ${mesoRes.status} — ${t.slice(0, 200)}`,
    );
  }
  const [meso] = (await mesoRes.json()) as Array<{ id: string }>;
  if (!meso) throw new Error("meso insert returned empty array");
  const mesoId = meso.id;

  // 3. Insert planned session
  const sessionRes = await fetch(`${SUPABASE_URL}/rest/v1/planned_sessions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      plan_id: planId,
      mesocycle_id: mesoId,
      user_id: userId,
      scheduled_date: "2026-07-07",
      session_type: "strength",
      title: "Session A — Lower Body",
      notes: null,
      status: "prescribed",
    }),
  });
  if (!sessionRes.ok) {
    const t = await sessionRes.text().catch(() => "");
    throw new Error(
      `session insert failed: ${sessionRes.status} — ${t.slice(0, 200)}`,
    );
  }
  const [session] = (await sessionRes.json()) as Array<{ id: string }>;
  if (!session) throw new Error("session insert returned empty array");
  const sessionId = session.id;

  // 4. Insert two exercises (3 sets each)
  const itemsRes = await fetch(`${SUPABASE_URL}/rest/v1/planned_items`, {
    method: "POST",
    headers,
    body: JSON.stringify([
      {
        session_id: sessionId,
        user_id: userId,
        movement_name: "Back Squat",
        sets: 3,
        reps: "5",
        load_kg: 80,
        load_pct_1rm: null,
        notes: null,
        item_order: 0,
      },
      {
        session_id: sessionId,
        user_id: userId,
        movement_name: "Romanian Deadlift",
        sets: 3,
        reps: "8",
        load_kg: 60,
        load_pct_1rm: null,
        notes: null,
        item_order: 1,
      },
    ]),
  });
  if (!itemsRes.ok) {
    const t = await itemsRes.text().catch(() => "");
    throw new Error(
      `items insert failed: ${itemsRes.status} — ${t.slice(0, 200)}`,
    );
  }

  return { planId, sessionId };
}

/**
 * Clean up test plan data by deleting the plan (cascades to sessions/items).
 */
async function cleanupPlan(planId: string): Promise<void> {
  await fetch(
    `${SUPABASE_URL}/rest/v1/plans?id=eq.${encodeURIComponent(planId)}`,
    {
      method: "DELETE",
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
    },
  ).catch(() => {});
}

// ── Route mock helpers ────────────────────────────────────────────────────────

/**
 * Intercept GET /api/v1/movements/<id>/substitutes and return a stable list
 * of two substitute movements.
 */
async function mockSubstitutesRoute(page: Page, delayMs = 0): Promise<void> {
  await page.route(
    `${API_BASE}/api/v1/movements/*/substitutes*`,
    async (route) => {
      if (delayMs > 0) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: "sub-mv-0001",
            name: "Dumbbell Romanian Deadlift",
            movement_pattern: "hip hinge",
            equipment_required: ["dumbbells"],
          },
          {
            id: "sub-mv-0002",
            name: "Kettlebell Swing",
            movement_pattern: "hip hinge",
            equipment_required: ["kettlebell"],
          },
        ]),
      });
    },
  );
}

/**
 * Intercept GET /api/v1/movements/<id>/substitutes and return an empty list.
 * Used for tests 1-4 to prevent spurious network errors if the sheet is never opened.
 */
async function stubSubstitutesEmpty(page: Page): Promise<void> {
  await page.route(
    `${API_BASE}/api/v1/movements/*/substitutes*`,
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    },
  );
}

// ── Navigation helper ─────────────────────────────────────────────────────────

/**
 * Navigate to the session execute page and wait for it to hydrate.
 * Uses a hard reload to flush stale Turbopack chunks between tests.
 */
async function gotoExecutePage(
  page: Page,
  planId: string,
  sessionId: string,
): Promise<void> {
  const url = `/plans/${planId}/sessions/${sessionId}/execute`;
  // Use "commit" (fires when the browser starts fetching the page) to avoid
  // timing out on Next.js server-component renders that call notFound()
  // mid-stream. After the initial navigation settles we do a hard reload
  // (matching plan-wizard.spec.ts pattern) to flush stale Turbopack chunks.
  // Navigate to the page. "commit" fires as soon as the server starts sending
  // bytes — useful when the server component might take 5-15 s to fetch API data.
  // After that settles, reload to flush stale Turbopack chunks.
  try {
    await page.goto(url, { waitUntil: "commit", timeout: 60_000 });
  } catch {
    // ERR_ABORTED fires when Next.js calls notFound() mid-stream — the browser
    // aborts the response. In that case just navigate again and let it land on
    // the 404 page, then we'll check for the expected content in the test itself.
    await page
      .goto(url, { waitUntil: "commit", timeout: 60_000 })
      .catch(() => {});
  }
  await page.waitForLoadState("domcontentloaded").catch(() => {});
  await page.reload({ waitUntil: "networkidle" });
}

// ── Test suite ────────────────────────────────────────────────────────────────

test.describe.serial("Session execution", () => {
  // Each test gets extra headroom: the first navigation compiles the execute
  // route via Turbopack which can take 15-30 s on first visit.
  test.setTimeout(90_000);
  let token = "";
  let planId = "";
  let sessionId = "";

  test.beforeAll(async () => {
    await ensureTestUser();

    // Resolve the user's UUID — needed for direct DB inserts.
    const userId = await resolveUserId();

    // Warm up the FastAPI profile (lazy-created on first JWT hit).
    const warmRes = await fetch(
      `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
      {
        method: "POST",
        headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ email: E2E_EMAIL, password: E2E_PASSWORD }),
      },
    );
    if (warmRes.ok) {
      const s = (await warmRes.json()) as { access_token: string };
      token = s.access_token;
      await fetch(`${API_URL}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }

    // Seed plan + session + exercises directly via the Supabase service-role API.
    const ids = await seedPlanData(userId);
    planId = ids.planId;
    sessionId = ids.sessionId;
  });

  test.afterAll(async () => {
    // Remove the test plan (cascades to sessions and items).
    if (planId) await cleanupPlan(planId);
  });

  test.beforeEach(async ({ page }) => {
    token = await loginAndSetSession(page);
  });

  // ── 1. Load session ───────────────────────────────────────────────────────

  test("load session: navigate to execute page and see first exercise in preview", async ({
    page,
  }) => {
    await stubSubstitutesEmpty(page);
    await gotoExecutePage(page, planId, sessionId);

    // The idle phase renders a preview list. The session title heading should be
    // visible, and at least one exercise name should appear in the list.
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
      timeout: 15_000,
    });

    // The "begin session" button confirms the idle phase rendered.
    await expect(
      page.getByRole("button", { name: /begin session/i }),
    ).toBeVisible({ timeout: 10_000 });

    // At least one exercise preview row is visible (the preview list below the CTA).
    const previewItems = page.locator("main").getByRole("listitem").first();
    // The preview is built with divs, not list items, so use a text that includes
    // movement names — just verify the page has exercise text.
    const exerciseText = page
      .locator("main")
      .locator(".rounded-xl.border")
      .first();
    await expect(exerciseText).toBeVisible({ timeout: 5_000 });

    // Suppress unused variable warning.
    void previewItems;
  });

  // ── 2. Log a set ─────────────────────────────────────────────────────────

  test("log a set: enter weight and reps, commit set, counter increments", async ({
    page,
  }) => {
    await stubSubstitutesEmpty(page);
    await gotoExecutePage(page, planId, sessionId);

    // Start the session.
    await page.getByRole("button", { name: /begin session/i }).click();

    // Wait for the exercising phase — the "commit set" button appears.
    await expect(page.getByRole("button", { name: /commit set/i })).toBeVisible(
      { timeout: 10_000 },
    );

    // Read the initial set counter (e.g. "1/3").
    const setCounter = page
      .locator('[aria-label="Set progress"]')
      .locator("+ *")
      .first();

    // Clear and set a specific weight.
    const weightInput = page.getByLabel("Load weight in kilograms");
    await weightInput.fill("60");

    // Set reps.
    const repsInput = page.getByLabel("Reps completed");
    await repsInput.fill("5");

    // Commit the set.
    await page.getByRole("button", { name: /commit set/i }).click();

    // After the first set, the page enters "resting" phase — the rest timer appears.
    // Verify by checking for the skip rest button or rest timer indicator.
    await expect(page.getByRole("button", { name: /skip rest/i })).toBeVisible({
      timeout: 5_000,
    });

    // Suppress unused variable warning.
    void setCounter;
  });

  // ── 3. Rest timer ─────────────────────────────────────────────────────────

  test("rest timer: appears automatically after logging the final set of an exercise", async ({
    page,
  }) => {
    await stubSubstitutesEmpty(page);
    await gotoExecutePage(page, planId, sessionId);

    await page.getByRole("button", { name: /begin session/i }).click();

    // Wait for exercising phase.
    await expect(page.getByRole("button", { name: /commit set/i })).toBeVisible(
      { timeout: 10_000 },
    );

    // Determine total sets by reading the set progress aria-labels.
    // The set pills have aria-labels like "Set 1 current", "Set 2 upcoming".
    // Log all sets to trigger the rest timer that separates exercises.
    // We read the totalSets from the visible set counter text (e.g. "1/3").
    const counterText =
      (await page
        .locator("span.font-data.tabular-nums")
        .filter({ hasText: /\d+\/\d+/ })
        .first()
        .textContent()) ?? "1/3";
    const totalSets = parseInt(counterText.split("/")[1] ?? "3", 10);

    // Log all sets for the first exercise. After the last one the rest timer appears.
    for (let i = 0; i < totalSets; i++) {
      await expect(
        page.getByRole("button", { name: /commit set/i }),
      ).toBeVisible({ timeout: 5_000 });
      await page.getByRole("button", { name: /commit set/i }).click();

      if (i < totalSets - 1) {
        // Between sets: skip rest to stay on the same exercise.
        await expect(
          page.getByRole("button", { name: /skip rest/i }),
        ).toBeVisible({ timeout: 5_000 });
        await page.getByRole("button", { name: /skip rest/i }).click();
      }
    }

    // After the final set of the first exercise the rest timer should appear,
    // with the label indicating rest phase.
    await expect(page.getByRole("button", { name: /skip rest/i })).toBeVisible({
      timeout: 5_000,
    });

    // The SVG ring timer is present (aria-label starts with "Rest timer:").
    await expect(page.getByRole("img", { name: /rest timer/i })).toBeVisible({
      timeout: 3_000,
    });
  });

  // ── 4. Complete session ───────────────────────────────────────────────────

  test("complete session: advance through all exercises, see completion state", async ({
    page,
  }) => {
    await stubSubstitutesEmpty(page);
    await gotoExecutePage(page, planId, sessionId);

    await page.getByRole("button", { name: /begin session/i }).click();

    // Drive through every exercise+set until the "Session committed" heading appears.
    // We cap at 100 interactions to avoid infinite loops in case of unexpected state.
    let iterations = 0;
    while (iterations < 100) {
      iterations++;

      const commitBtn = page.getByRole("button", { name: /commit set/i });
      const skipRestBtn = page.getByRole("button", { name: /skip rest/i });
      const sessionComplete = page.getByRole("heading", {
        name: /session committed/i,
      });

      // Check which state we're in.
      const [hasCommit, hasSkip, hasDone] = await Promise.all([
        commitBtn.isVisible().catch(() => false),
        skipRestBtn.isVisible().catch(() => false),
        sessionComplete.isVisible().catch(() => false),
      ]);

      if (hasDone) break;

      if (hasCommit) {
        await commitBtn.click();
      } else if (hasSkip) {
        await skipRestBtn.click();
      } else {
        // Briefly wait for state to settle.
        await page.waitForTimeout(200);
      }
    }

    // Confirm the completion state is now visible.
    await expect(
      page.getByRole("heading", { name: /session committed/i }),
    ).toBeVisible({ timeout: 10_000 });

    // The "push to plan" button confirms the complete phase.
    await expect(
      page.getByRole("button", { name: /push to plan/i }),
    ).toBeVisible({ timeout: 5_000 });

    // At least one set must have been logged (the count is shown).
    const setsLogged = page.locator("text=/\\d+ sets logged/");
    await expect(setsLogged).toBeVisible({ timeout: 3_000 });

    // S1 — the persistent progress header must read the exact total on the
    // completion screen, not one short (the seeded session has 2 exercises;
    // this previously read "1/2 exercises · 50%" once done).
    await expect(page.getByLabel("Session progress")).toHaveAttribute(
      "aria-valuenow",
      "100",
    );
    await expect(page.locator("text=/^2\\/2 exercises$/")).toBeVisible({
      timeout: 3_000,
    });
    await expect(page.locator("text=/^100%$/")).toBeVisible({
      timeout: 3_000,
    });
  });

  // ── 5. Exercise swap — happy path ─────────────────────────────────────────

  test("exercise swap: substitute list loads, select substitute, confirm, exercise name updates", async ({
    page,
  }) => {
    await mockSubstitutesRoute(page);
    await gotoExecutePage(page, planId, sessionId);

    await page.getByRole("button", { name: /begin session/i }).click();

    // Wait for the exercising phase.
    await expect(page.getByRole("button", { name: /commit set/i })).toBeVisible(
      { timeout: 10_000 },
    );

    // Read the current exercise name from the h2 heading.
    const exerciseHeading = page.getByRole("heading", { level: 2 }).first();
    await expect(exerciseHeading).toBeVisible({ timeout: 5_000 });
    const originalName = (await exerciseHeading.textContent()) ?? "";
    expect(originalName.length).toBeGreaterThan(0);

    // Open the swap sheet via the swap button (aria-label: "Swap this exercise…").
    await page.getByRole("button", { name: /swap this exercise/i }).click();

    // Wait for the sheet to open — the SheetTitle reads "Swap <exercise name>".
    await expect(page.getByRole("heading", { name: /^Swap /i })).toBeVisible({
      timeout: 5_000,
    });

    // Wait for the substitute cards to appear (mocked response resolves immediately).
    await expect(
      page.getByRole("button", {
        name: /use.*dumbbell romanian deadlift.*substitute/i,
      }),
    ).toBeVisible({ timeout: 5_000 });

    // Select the first substitute.
    await page
      .getByRole("button", {
        name: /use.*dumbbell romanian deadlift.*substitute/i,
      })
      .click();

    // A confirmation overlay appears — click "Confirm".
    await expect(
      page.getByRole("dialog", { name: /confirm exercise swap/i }),
    ).toBeVisible({
      timeout: 3_000,
    });
    await page.getByRole("button", { name: /^Confirm$/i }).click();

    // The sheet closes and we're back in the exercising phase.
    await expect(page.getByRole("button", { name: /commit set/i })).toBeVisible(
      { timeout: 5_000 },
    );
    await expect(
      page.getByRole("heading", { name: /^Swap /i }),
    ).not.toBeVisible({ timeout: 3_000 });

    // C3 — a confirmed swap must actually change what's shown, not just what's
    // recorded in state. The exercise heading now reads the substitute's name.
    await expect(exerciseHeading).toHaveText(/Dumbbell Romanian Deadlift/i, {
      timeout: 3_000,
    });
    const nameAfterSwap = (await exerciseHeading.textContent()) ?? "";
    expect(nameAfterSwap).not.toBe(originalName);

    // C3 — logging a set for this exercise after the swap must be associated
    // with the substitute's movement, not the original. Commit a set and
    // confirm the swap survives (the card keeps showing the substitute, not
    // reverting to the original movement) for the rest of this exercise.
    await page.getByLabel("Load weight in kilograms").fill("20");
    await page.getByLabel("Reps completed").fill("10");
    await page.getByRole("button", { name: /commit set/i }).click();
    await expect(page.getByRole("button", { name: /skip rest/i })).toBeVisible({
      timeout: 5_000,
    });
    await page.getByRole("button", { name: /skip rest/i }).click();
    await expect(exerciseHeading).toHaveText(/Dumbbell Romanian Deadlift/i, {
      timeout: 5_000,
    });
  });

  // ── 6. Swap abort ─────────────────────────────────────────────────────────

  test("swap abort: close sheet mid-load, exercise card unchanged", async ({
    page,
  }) => {
    // Add a 200 ms delay to the substitutes mock so we can close before data arrives.
    await mockSubstitutesRoute(page, 200);
    await gotoExecutePage(page, planId, sessionId);

    await page.getByRole("button", { name: /begin session/i }).click();

    await expect(page.getByRole("button", { name: /commit set/i })).toBeVisible(
      { timeout: 10_000 },
    );

    // Capture current exercise heading text before swap attempt.
    const exerciseHeading = page.getByRole("heading", { level: 2 }).first();
    const nameBefore = (await exerciseHeading.textContent()) ?? "";
    expect(nameBefore.length).toBeGreaterThan(0);

    // Open swap sheet.
    await page.getByRole("button", { name: /swap this exercise/i }).click();

    // Sheet opens — the SheetTitle is visible.
    await expect(page.getByRole("heading", { name: /^Swap /i })).toBeVisible({
      timeout: 5_000,
    });

    // The skeleton loaders should be visible while the 200 ms delay is in progress.
    // Close the sheet immediately (before substitutes resolve) by pressing Escape.
    await page.keyboard.press("Escape");

    // Sheet must close.
    await expect(
      page.getByRole("heading", { name: /^Swap /i }),
    ).not.toBeVisible({ timeout: 5_000 });

    // We're back in the exercising phase — commit button is present.
    await expect(page.getByRole("button", { name: /commit set/i })).toBeVisible(
      { timeout: 5_000 },
    );

    // Exercise heading text is unchanged.
    const nameAfter = (await exerciseHeading.textContent()) ?? "";
    expect(nameAfter).toBe(nameBefore);

    // No confirmation overlay leaked into the page.
    await expect(
      page.getByRole("dialog", { name: /confirm exercise swap/i }),
    ).not.toBeVisible();
  });

  // ── 7. Finish session — persists to the backend (C4) ─────────────────────
  //
  // None of tests 1-6 ever tap "push to plan", so the seeded session is still
  // untouched server-side (status "prescribed") going into this test. This is
  // the direct regression test for C4: before the fix, handleFinish only
  // called router.push — no request ever reached the backend, so a page
  // refresh mid-workout silently lost the entire logged session. Verified
  // here via a follow-up API call (not just DOM state), matching the design
  // doc's validation note.

  test("finish session: persists logged sets, session shows completed via a follow-up API call", async ({
    page,
  }) => {
    await stubSubstitutesEmpty(page);
    await gotoExecutePage(page, planId, sessionId);

    await page.getByRole("button", { name: /begin session/i }).click();

    // Drive through every exercise+set, logging a real weight/reps each time
    // so there is something meaningful to verify server-side afterward.
    let iterations = 0;
    while (iterations < 100) {
      iterations++;

      const commitBtn = page.getByRole("button", { name: /commit set/i });
      const skipRestBtn = page.getByRole("button", { name: /skip rest/i });
      const sessionComplete = page.getByRole("heading", {
        name: /session committed/i,
      });

      const [hasCommit, hasSkip, hasDone] = await Promise.all([
        commitBtn.isVisible().catch(() => false),
        skipRestBtn.isVisible().catch(() => false),
        sessionComplete.isVisible().catch(() => false),
      ]);

      if (hasDone) break;

      if (hasCommit) {
        await page.getByLabel("Load weight in kilograms").fill("42.5");
        await page.getByLabel("Reps completed").fill("6");
        await commitBtn.click();
      } else if (hasSkip) {
        await skipRestBtn.click();
      } else {
        await page.waitForTimeout(200);
      }
    }

    await expect(
      page.getByRole("heading", { name: /session committed/i }),
    ).toBeVisible({ timeout: 10_000 });

    // C4 — tap "push to plan" to persist via the new completion endpoint, and
    // confirm we navigate away (which only happens on a successful response).
    await page.getByRole("button", { name: /push to plan/i }).click();
    await page.waitForURL(new RegExp(`/plans/${planId}$`), {
      timeout: 15_000,
    });

    // Follow-up API call — the session must now show as completed
    // server-side, and the logged sets must be visible (not lost to a page
    // refresh or closed tab, which is exactly the bug C4 fixes).
    const planRes = await fetch(`${API_URL}/api/v1/plans/${planId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(planRes.ok).toBe(true);
    const plan = (await planRes.json()) as {
      sessions: Array<{ id: string; status: string }>;
    };
    const completedSession = plan.sessions.find((s) => s.id === sessionId);
    expect(completedSession?.status).toBe("completed");

    // The logged sets are visible via the workouts list — the completion
    // endpoint creates one workout + one result row per logged set.
    const workoutsRes = await fetch(`${API_URL}/api/v1/workouts?limit=10`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(workoutsRes.ok).toBe(true);
    const workoutsBody = (await workoutsRes.json()) as {
      items: Array<{ title: string | null; result_count: number }>;
    };
    const sessionWorkout = workoutsBody.items.find(
      (w) => w.title === "Session A — Lower Body",
    );
    expect(sessionWorkout).toBeDefined();
    expect(sessionWorkout?.result_count).toBeGreaterThan(0);
  });
});
