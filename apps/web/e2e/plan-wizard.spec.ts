/**
 * Plan Wizard E2E tests (FE-12).
 *
 * Covers all wizard flows introduced in FE-11 (CreatePlanWizard):
 *   1. General CrossFit — 4-step flow (no target-movement step)
 *   2. Skill Acquisition — 5-step flow (target-movement step present)
 *   3. 1RM Peak — 5-step flow with 1RM input field
 *   4. Full Gym equipment auto-lock
 *   5. Back navigation preserves prior selections
 *   6. Validation gate — commit button disabled until training age selected
 *
 * All tests use page.route() to mock the FastAPI backend so no real API is
 * needed. Auth is injected via the same @supabase/ssr cookie pattern used by
 * workout-tracker.spec.ts.
 *
 * Requirements to run locally:
 *   - supabase start  (for the auth cookie injection to resolve)
 *   - Next.js dev server on http://localhost:3000
 *   - FastAPI does NOT need to be running (all calls are intercepted)
 */

import { type Page, expect, test } from "@playwright/test";

// ── Configuration ─────────────────────────────────────────────────────────────

const E2E_EMAIL = "e2e-wizard@test.local";
const E2E_PASSWORD = "E2eTestFitHub!2026";
const SUPABASE_URL = "http://127.0.0.1:54321";

// Local Supabase demo keys — safe to commit; only valid against the local stack.
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

// FastAPI base URL as configured in the frontend (NEXT_PUBLIC_API_URL default).
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ── Auth helpers ──────────────────────────────────────────────────────────────

/**
 * Create the E2E test user idempotently and seed a profile row with
 * onboarding_completed = true so the app layout does not redirect to /onboarding.
 *
 * The profile row is written directly to public.profiles via the service-role
 * REST API because the App Router layout fetches it server-side (Node.js) and
 * page.route() cannot intercept those server-to-server calls.
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

  // Resolve the user's UUID from their JWT (sub claim).
  // We do a password grant to get the access token, then decode the sub.
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

  // Mark onboarding as complete so the app layout does not redirect to /onboarding.
  // The profile row already exists (created by the handle_new_user trigger on signup).
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
 * Obtain a fresh JWT from Supabase and inject it as the @supabase/ssr
 * session cookie so Next.js server components see an authenticated session.
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

// ── Route mocking helpers ─────────────────────────────────────────────────────

/** Synthetic task ID used across mocked responses. */
const MOCK_TASK_ID = "task-e2e-0001";
const MOCK_PLAN_ID = "plan-e2e-9999";

/**
 * Wire up page.route() mocks for both legs of plan creation:
 *   POST /api/v1/plans           → 202 { task_id }
 *   GET  /api/v1/plans/tasks/*   → 200 { status: "complete", plan_id }
 *
 * Also captures the POST body into capturedBody if provided.
 */
async function mockPlanApi(
  page: Page,
  capturedBody?: { payload: Record<string, unknown> },
): Promise<void> {
  await page.route(`${API_BASE}/api/v1/plans`, async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }
    if (capturedBody) {
      try {
        capturedBody.payload = JSON.parse(
          route.request().postData() ?? "{}",
        ) as Record<string, unknown>;
      } catch {
        capturedBody.payload = {};
      }
    }
    await route.fulfill({
      status: 202,
      contentType: "application/json",
      body: JSON.stringify({ task_id: MOCK_TASK_ID }),
    });
  });

  await page.route(
    `${API_BASE}/api/v1/plans/tasks/${MOCK_TASK_ID}`,
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          task_id: MOCK_TASK_ID,
          status: "complete",
          plan_id: MOCK_PLAN_ID,
        }),
      });
    },
  );
}

/**
 * Mock the movements search endpoint (used by TargetMovementStep).
 * Returns a single movement with the given id and name.
 */
async function mockMovementsSearch(
  page: Page,
  movementId: string,
  movementName: string,
): Promise<void> {
  await page.route(`${API_BASE}/api/v1/movements*`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{ id: movementId, name: movementName }]),
    });
  });
}

// ── Step navigation helpers ───────────────────────────────────────────────────

/**
 * Navigate to /plans/new and wait for full React hydration.
 *
 * In Turbopack dev mode, navigating between tests can leave stale chunks that
 * prevent event handlers from attaching even though the DOM renders correctly
 * (Next.js SSR delivers the HTML but React hasn't re-hydrated the client tree).
 *
 * Strategy: always do a hard reload after the initial goto to guarantee the
 * Turbopack dev server serves fresh chunks and React fully hydrates before we
 * attempt any interaction. Then wait for the network to settle.
 */
async function gotoWizard(page: Page): Promise<void> {
  // First navigation: let the server render the page.
  await page.goto("/plan/new", { waitUntil: "domcontentloaded" });

  // Hard reload to flush any stale Turbopack chunks from the previous test.
  // This is safe to do unconditionally and ensures React event handlers attach.
  await page.reload({ waitUntil: "networkidle" });

  // Confirm the wizard shell is visible.
  await expect(
    page.getByRole("heading", { name: /git checkout/i }),
  ).toBeVisible({ timeout: 15_000 });
}

/** Click an archetype card by its data-testid slug and wait for step 2. */
async function selectArchetype(page: Page, slug: string): Promise<void> {
  const card = page.locator(`[data-testid="archetype-${slug}"]`);
  await expect(card).toBeVisible({ timeout: 10_000 });
  // Click the card. After the hard reload in gotoWizard React is fully hydrated
  // so a standard Playwright click reaches the onClick handler.
  await card.click();
  // Selecting an archetype auto-advances to step 2 (equipment).
  // Wait for the EquipmentStep "continue" button to appear.
  await expect(page.locator('[data-testid="continue-btn"]')).toBeVisible({
    timeout: 10_000,
  });
}

/** Select an equipment preset by clicking its label button. */
async function selectPreset(page: Page, preset: string): Promise<void> {
  await page.getByRole("button", { name: `Toggle ${preset}` }).click();
}

/** Click the Continue button on the equipment step and wait for step 3. */
async function continueFromEquipment(page: Page): Promise<void> {
  await page.locator('[data-testid="continue-btn"]').click();
  await expect(page.getByText("Days per week")).toBeVisible({ timeout: 5_000 });
}

/** Select days-per-week and click Continue to advance from the schedule step. */
async function completeSchedule(
  page: Page,
  days: number,
  weeks: number,
): Promise<void> {
  // Days per week buttons are inside the days fieldset.
  await page
    .locator('[data-testid="days-buttons"]')
    .getByRole("button", { name: String(days) })
    .click();

  // Weeks buttons are inside the weeks fieldset.
  await page
    .locator('[data-testid="weeks-buttons"]')
    .getByRole("button", { name: String(weeks) })
    .click();

  await page.getByRole("button", { name: "Continue" }).click();
}

// ── Test suite ────────────────────────────────────────────────────────────────

test.describe.serial("Plan wizard", () => {
  test.beforeAll(async () => {
    await ensureTestUser();
  });

  test.beforeEach(async ({ page }) => {
    await loginAndSetSession(page);
  });

  // ── 1. General CrossFit — 4-step flow, no target-movement step ───────────

  test("general-crossfit flow completes in 4 steps and posts correct payload", async ({
    page,
  }) => {
    const captured: { payload: Record<string, unknown> } = { payload: {} };
    await mockPlanApi(page, captured);

    await gotoWizard(page);

    // Step 1 — archetype
    await selectArchetype(page, "general-crossfit");

    // Step 2 — equipment
    await selectPreset(page, "Full Gym");
    await continueFromEquipment(page);

    // Step 3 — schedule
    await completeSchedule(page, 4, 12);

    // For general-crossfit the wizard skips step 3 (target movement)
    // and jumps directly to step 4 (training age).
    // The heading reads "step 5 — training age" because TrainingAgeStep
    // always renders "step 5" (it is the 5th internal step in a 5-step flow,
    // and also the 4th display step in a 4-step flow but the heading text
    // is hardcoded as "step 5" in the component).
    await expect(page.getByText(/training age/i)).toBeVisible({
      timeout: 5_000,
    });

    // Confirm no target-movement step appeared (step 4 heading not visible).
    await expect(page.getByText(/target movement/i)).not.toBeVisible();

    // Step 4 (display) — training age
    await page.locator('[data-testid="training-age-intermediate"]').click();

    // The submit button should now be enabled.
    const commitBtn = page.locator('[data-testid="commit-plan-btn"]');
    await expect(commitBtn).toBeEnabled();
    await commitBtn.click();

    // Wait for redirect to the plan detail page.
    await expect(page).toHaveURL(`/plan/${MOCK_PLAN_ID}`, { timeout: 15_000 });

    // Assert the POST body contained the expected fields.
    expect(captured.payload["archetype"]).toBe("general-crossfit");
    expect(captured.payload["training_age"]).toBe("intermediate");
    expect(captured.payload["days_per_week"]).toBe(4);
    expect(captured.payload["weeks"]).toBe(12);
    // Full Gym resolves to all 10 equipment tags.
    const equipment = captured.payload["equipment"] as string[];
    expect(equipment).toContain("barbell");
    expect(equipment).toContain("rings");
    expect(equipment).toContain("rower");
    // No target_movement_id for a general archetype.
    expect(captured.payload["target_movement_id"]).toBeUndefined();
  });

  // ── 2. Skill Acquisition — 5-step flow, target-movement step present ─────

  test("skill-acquisition flow shows 5-step indicator and target_movement_id in payload", async ({
    page,
  }) => {
    const captured: { payload: Record<string, unknown> } = { payload: {} };
    await mockPlanApi(page, captured);
    await mockMovementsSearch(page, "mv-muscle-up-01", "Muscle-up");

    await gotoWizard(page);

    // Step 1 — archetype
    await selectArchetype(page, "skill-acquisition");
    // selectArchetype auto-advances to step 2 (equipment). At that point,
    // step 1 is "completed" and step 2 is "current". For a 5-step archetype
    // the total-steps label changes from 4 to 5.

    // Verify the step indicator shows 5 dots by checking the aria-label of the
    // now-current dot (step 2 of 5).
    await expect(
      page.locator('[aria-label="Step 2 of 5, current"]'),
    ).toBeVisible({ timeout: 3_000 });

    // Step 2 — equipment
    await selectPreset(page, "Bodyweight");
    await continueFromEquipment(page);

    // Step 3 — schedule
    await completeSchedule(page, 3, 8);

    // Step 4 — target movement (must appear for skill-acquisition)
    await expect(page.getByText(/target movement/i)).toBeVisible({
      timeout: 5_000,
    });
    await expect(page.getByText(/skill are you working toward/i)).toBeVisible();

    // Search for a movement.
    await page.getByLabel("Search movements").fill("Muscle");
    await expect(page.getByRole("button", { name: "Muscle-up" })).toBeVisible({
      timeout: 3_000,
    });
    await page.getByRole("button", { name: "Muscle-up" }).click();

    // Selected chip appears; continue to training age.
    await expect(page.getByText("Muscle-up")).toBeVisible();
    await page.locator('[data-testid="continue-btn"]').click();

    // Step 5 — training age
    await expect(page.getByText(/training age/i)).toBeVisible({
      timeout: 5_000,
    });
    await page.locator('[data-testid="training-age-beginner"]').click();

    const commitBtn = page.locator('[data-testid="commit-plan-btn"]');
    await expect(commitBtn).toBeEnabled();
    await commitBtn.click();

    await expect(page).toHaveURL(`/plan/${MOCK_PLAN_ID}`, { timeout: 15_000 });

    // target_movement_id must be present in the submitted payload.
    expect(captured.payload["archetype"]).toBe("skill-acquisition");
    expect(captured.payload["target_movement_id"]).toBe("mv-muscle-up-01");
  });

  // ── 3. 1RM Peak — 5-step flow with 1RM field ─────────────────────────────

  test("one-rm-peak flow exposes 1RM input and includes current_1rm_kg in payload", async ({
    page,
  }) => {
    const captured: { payload: Record<string, unknown> } = { payload: {} };
    await mockPlanApi(page, captured);
    await mockMovementsSearch(page, "mv-snatch-01", "Snatch");

    await gotoWizard(page);

    // Step 1
    await selectArchetype(page, "one-rm-peak");

    // Step 2
    await selectPreset(page, "Barbell Only");
    await continueFromEquipment(page);

    // Step 3
    await completeSchedule(page, 5, 16);

    // Step 4 — target movement (1RM context)
    await expect(page.getByText(/target movement/i)).toBeVisible({
      timeout: 5_000,
    });
    await expect(page.getByText(/lift are you peaking for/i)).toBeVisible();

    // Search and select a movement.
    await page.getByLabel("Search movements").fill("Snatch");
    await expect(page.getByRole("button", { name: "Snatch" })).toBeVisible({
      timeout: 3_000,
    });
    await page.getByRole("button", { name: "Snatch" }).click();

    // 1RM input must appear after selecting a movement.
    const rmInput = page.locator("#current-1rm");
    await expect(rmInput).toBeVisible({ timeout: 3_000 });

    // Enter a 1RM value.
    await rmInput.fill("80");

    // Continue to training age.
    await page.locator('[data-testid="continue-btn"]').click();

    // Step 5 — training age
    await expect(page.getByText(/training age/i)).toBeVisible({
      timeout: 5_000,
    });
    await page.locator('[data-testid="training-age-advanced"]').click();

    const commitBtn = page.locator('[data-testid="commit-plan-btn"]');
    await expect(commitBtn).toBeEnabled();
    await commitBtn.click();

    await expect(page).toHaveURL(`/plan/${MOCK_PLAN_ID}`, { timeout: 15_000 });

    expect(captured.payload["archetype"]).toBe("one-rm-peak");
    expect(captured.payload["target_movement_id"]).toBe("mv-snatch-01");
    expect(captured.payload["current_1rm_kg"]).toBe(80);
  });

  // ── 4. Full Gym auto-lock ─────────────────────────────────────────────────

  test("selecting Full Gym checks and disables all other presets", async ({
    page,
  }) => {
    await gotoWizard(page);

    // Navigate to step 2 (equipment).
    await selectArchetype(page, "general-crossfit");

    // Select Full Gym.
    await selectPreset(page, "Full Gym");

    // All preset checkboxes should now be checked.
    const PRESETS = [
      "Full Gym",
      "Home Setup",
      "Barbell Only",
      "Travel",
      "Bodyweight",
    ];
    for (const preset of PRESETS) {
      await expect(
        page.getByRole("checkbox", { name: `Select ${preset}` }),
      ).toHaveAttribute("aria-checked", "true");
    }

    // The non-Full Gym checkboxes must be disabled.
    for (const preset of PRESETS.filter((p) => p !== "Full Gym")) {
      await expect(
        page.getByRole("checkbox", { name: `Select ${preset}` }),
      ).toBeDisabled();
    }

    // Advance to schedule and submit to verify the equipment array.
    const captured: { payload: Record<string, unknown> } = { payload: {} };
    await mockPlanApi(page, captured);
    await continueFromEquipment(page);
    await completeSchedule(page, 4, 12);

    // Training age
    await page.locator('[data-testid="training-age-intermediate"]').click();
    await page.locator('[data-testid="commit-plan-btn"]').click();

    await expect(page).toHaveURL(`/plan/${MOCK_PLAN_ID}`, { timeout: 15_000 });

    // Full Gym resolves to 10 tags — all should be present.
    const equipment = captured.payload["equipment"] as string[];
    const fullGymTags = [
      "barbell",
      "bike",
      "dumbbells",
      "jump_rope",
      "kettlebell",
      "pull_up_bar",
      "rack",
      "rings",
      "rower",
      "ski",
    ];
    for (const tag of fullGymTags) {
      expect(equipment).toContain(tag);
    }
  });

  // ── 5. Back navigation preserves state ───────────────────────────────────

  test("back navigation from schedule returns to equipment with prior selection intact", async ({
    page,
  }) => {
    await gotoWizard(page);

    // Step 1 — archetype
    await selectArchetype(page, "strength-bias");

    // Step 2 — select Home Setup
    await selectPreset(page, "Home Setup");

    // Verify the checkbox is checked before proceeding.
    await expect(
      page.getByRole("checkbox", { name: "Select Home Setup" }),
    ).toHaveAttribute("aria-checked", "true");

    // Advance to step 3 (schedule).
    await continueFromEquipment(page);
    await expect(page.getByText("Days per week")).toBeVisible();

    // Click back — should return to step 2 (equipment).
    await page.getByRole("button", { name: "back" }).click();
    // Verify we're back on the equipment step by checking for the continue button.
    await expect(page.locator('[data-testid="continue-btn"]')).toBeVisible({
      timeout: 5_000,
    });

    // The previously selected preset must still be checked.
    await expect(
      page.getByRole("checkbox", { name: "Select Home Setup" }),
    ).toHaveAttribute("aria-checked", "true");

    // Unselected presets must remain unchecked.
    await expect(
      page.getByRole("checkbox", { name: "Select Full Gym" }),
    ).toHaveAttribute("aria-checked", "false");
  });

  // ── 6. Validation gate — commit button disabled until training age set ────

  test("commit plan button is disabled until training age is selected", async ({
    page,
  }) => {
    await mockPlanApi(page);
    await gotoWizard(page);

    // Navigate to training age step via general-crossfit (4-step flow).
    await selectArchetype(page, "aerobic-base");
    await selectPreset(page, "Travel");
    await continueFromEquipment(page);
    await completeSchedule(page, 3, 8);

    // We should now be on the training age step.
    await expect(page.getByText(/training age/i)).toBeVisible({
      timeout: 5_000,
    });

    // The commit button must be disabled before any training age is selected.
    const commitBtn = page.locator('[data-testid="commit-plan-btn"]');
    await expect(commitBtn).toBeDisabled();

    // Select a training age — button becomes enabled.
    await page.locator('[data-testid="training-age-beginner"]').click();
    await expect(commitBtn).toBeEnabled();

    // Switching to another age keeps it enabled.
    await page.locator('[data-testid="training-age-advanced"]').click();
    await expect(commitBtn).toBeEnabled();
  });

  // ── 7. Custom title persists to the created plan (W1) ────────────────────

  test("editing the plan title persists the custom value, not the auto-generated one", async ({
    page,
  }) => {
    const captured: { payload: Record<string, unknown> } = { payload: {} };
    await mockPlanApi(page, captured);

    await gotoWizard(page);

    await selectArchetype(page, "general-crossfit");
    await selectPreset(page, "Full Gym");
    await continueFromEquipment(page);
    await completeSchedule(page, 4, 12);

    await expect(page.getByText(/training age/i)).toBeVisible({
      timeout: 5_000,
    });
    await page.locator('[data-testid="training-age-intermediate"]').click();

    // The title field auto-fills from archetype + training age.
    const titleInput = page.locator('[data-testid="plan-title-input"]');
    await expect(titleInput).toHaveValue(/Intermediate/);

    // Overwrite it with a custom title.
    await titleInput.fill("My Totally Custom Plan Title");
    await expect(titleInput).toHaveValue("My Totally Custom Plan Title");

    const commitBtn = page.locator('[data-testid="commit-plan-btn"]');
    await expect(commitBtn).toBeEnabled();
    await commitBtn.click();

    await expect(page).toHaveURL(`/plan/${MOCK_PLAN_ID}`, { timeout: 15_000 });

    // The created plan's title must match the edited value, not the
    // auto-generated "Intermediate CrossFit Program".
    expect(captured.payload["title"]).toBe("My Totally Custom Plan Title");
  });

  // ── 8. Clearing 1RM across a movement change does not leak a stale value (W2) ─

  test("clearing 1RM and switching target movement submits no stale 1RM value", async ({
    page,
  }) => {
    const captured: { payload: Record<string, unknown> } = { payload: {} };
    await mockPlanApi(page, captured);

    // Return a different movement depending on the search query, so we can
    // simulate the user switching from one target movement to another.
    await page.route(`${API_BASE}/api/v1/movements*`, async (route) => {
      const q = (
        new URL(route.request().url()).searchParams.get("query") ?? ""
      ).toLowerCase();
      const results = q.includes("snatch")
        ? [{ id: "mv-snatch-01", name: "Snatch" }]
        : q.includes("clean")
          ? [{ id: "mv-clean-01", name: "Clean" }]
          : [];
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(results),
      });
    });

    await gotoWizard(page);

    await selectArchetype(page, "one-rm-peak");
    await selectPreset(page, "Barbell Only");
    await continueFromEquipment(page);
    await completeSchedule(page, 5, 16);

    await expect(page.getByText(/target movement/i)).toBeVisible({
      timeout: 5_000,
    });

    // Select movement A (Snatch) and enter a 1RM.
    await page.getByLabel("Search movements").fill("Snatch");
    await expect(page.getByRole("button", { name: "Snatch" })).toBeVisible({
      timeout: 3_000,
    });
    await page.getByRole("button", { name: "Snatch" }).click();

    const rmInput = page.locator("#current-1rm");
    await expect(rmInput).toBeVisible({ timeout: 3_000 });
    await rmInput.fill("100");

    // Clear the movement selection — this is meant to also clear the 1RM.
    await page
      .getByRole("button", { name: "Clear movement selection" })
      .click();

    // Select movement B (Clean) instead.
    await page.getByLabel("Search movements").fill("Clean");
    await expect(page.getByRole("button", { name: "Clean" })).toBeVisible({
      timeout: 3_000,
    });
    await page.getByRole("button", { name: "Clean" }).click();

    // The 1RM input must be empty for the newly selected movement — not the
    // stale 100 carried over from Snatch.
    const rmInputAfter = page.locator("#current-1rm");
    await expect(rmInputAfter).toBeVisible({ timeout: 3_000 });
    await expect(rmInputAfter).toHaveValue("");

    await page.locator('[data-testid="continue-btn"]').click();

    await expect(page.getByText(/training age/i)).toBeVisible({
      timeout: 5_000,
    });
    await page.locator('[data-testid="training-age-advanced"]').click();

    const commitBtn = page.locator('[data-testid="commit-plan-btn"]');
    await expect(commitBtn).toBeEnabled();
    await commitBtn.click();

    await expect(page).toHaveURL(`/plan/${MOCK_PLAN_ID}`, { timeout: 15_000 });

    expect(captured.payload["target_movement_id"]).toBe("mv-clean-01");
    expect(captured.payload["current_1rm_kg"]).toBeUndefined();
  });
});
