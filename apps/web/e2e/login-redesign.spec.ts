import { expect, test } from "@playwright/test";

test.describe("Login page — two-column layout", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("renders sign-in heading and magic link form", async ({ page }) => {
    // "Sign in" is a styled <span>, not a semantic heading
    await expect(page.getByText("Sign in").first()).toBeVisible();
    await expect(page.locator("#sign-email")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /send magic link/i }),
    ).toBeVisible();
  });

  test("renders OAuth buttons", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: /continue with google/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /continue with github/i }),
    ).toBeVisible();
  });

  test("renders request access card with email, motivation fields and submit", async ({
    page,
  }) => {
    // "Request access" is a styled <span>, not a semantic heading
    await expect(page.getByText("Request access").first()).toBeVisible();
    await expect(page.locator("#req-email")).toBeVisible();
    await expect(page.locator("#motivation")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /^request access$/i }),
    ).toBeVisible();
  });

  test("char counter starts at 0 and increments", async ({ page }) => {
    const counter = page.locator("text=0 chars");
    await expect(counter).toBeVisible();
    await page.locator("#motivation").fill("Hello world");
    await expect(page.locator("text=11 chars")).toBeVisible();
  });

  test("shows email validation error when magic link submitted empty", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /send magic link/i }).click();
    await expect(page.getByText(/email is required/i)).toBeVisible();
  });

  test("shows motivation validation error when motivation too short", async ({
    page,
  }) => {
    await page.locator("#req-email").fill("test@example.com");
    await page.locator("#motivation").fill("Too short");
    await page.getByRole("button", { name: /^request access$/i }).click();
    await expect(page.getByText(/min 15 characters/i)).toBeVisible();
  });

  test("desktop: brand panel (aside) is visible", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const aside = page.locator("aside");
    await expect(aside).toBeVisible();
    // h1 text has a <br> so match partial text only
    await expect(page.getByText(/your training/i).first()).toBeVisible();
  });

  test("desktop: terminal block is visible", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await expect(page.getByText("auth.log")).toBeVisible();
  });

  test("mobile: brand panel is hidden", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/login");
    const aside = page.locator("aside");
    // hidden md:flex — invisible at 375px
    await expect(aside).not.toBeVisible();
  });

  test("mobile: logo is shown in the content panel", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/login");
    // mobile logo is a flex container with .md:hidden
    const mobileLogo = page.locator(".md\\:hidden").filter({
      hasText: "FitHub",
    });
    await expect(mobileLogo).toBeVisible();
  });
});
