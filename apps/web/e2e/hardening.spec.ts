import { expect, test } from "@playwright/test";

// Error boundary tests run without authentication — they check page-level
// rendering, not data access.

test.describe("404 page", () => {
  test("unknown route shows git-themed 404", async ({ page }) => {
    await page.goto("/this-does-not-exist");
    await expect(page.getByText(/pathspec not found/i)).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByText(/404/)).toBeVisible();
  });

  test("404 page 'git checkout main' link navigates to /login (unauthenticated)", async ({
    page,
  }) => {
    await page.goto("/this-does-not-exist");
    await page.getByRole("link", { name: /git checkout main/i }).click();
    // Unauthenticated users land on /login; authenticated on /dashboard
    await expect(page).toHaveURL(/\/(login|dashboard)/);
  });
});

test.describe("App error boundary", () => {
  test("error.tsx renders when a route throws (dev only)", async ({ page }) => {
    // /test-error throws unconditionally in non-production environments.
    // It 404s in production (handled by not-found.tsx instead).
    await page.goto("/test-error");

    // Next.js dev mode may show an overlay — dismiss it if present
    const overlay = page.locator("[data-nextjs-dialog]");
    if (await overlay.isVisible({ timeout: 1000 }).catch(() => false)) {
      await page.keyboard.press("Escape");
    }

    await expect(page.getByText(/merge conflict/i)).toBeVisible({
      timeout: 8000,
    });
    await expect(
      page.getByRole("button", { name: /git reset/i }),
    ).toBeVisible();
  });
});
