import { expect, test } from "@playwright/test";

// These smoke tests verify the auth flow routing without requiring a real login.
// Run: pnpm e2e (requires `supabase start` for the local Supabase instance).

test.describe("Auth routing", () => {
  test("root redirects unauthenticated user to /login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
  });

  test("dashboard redirects unauthenticated user to /login", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("callback with no code redirects to /login", async ({ page }) => {
    await page.goto("/auth/callback");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Login page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("renders FitHub branding", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "FitHub" })).toBeVisible();
  });

  test("has email input and submit button", async ({ page }) => {
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(
      page.getByRole("button", { name: /send magic link/i }),
    ).toBeVisible();
  });
});
