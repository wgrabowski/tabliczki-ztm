import { test, expect } from "@playwright/test";
import { test as authenticatedTest } from "./fixtures/authenticated.fixture";

/**
 * Smoke tests to verify E2E test setup is working correctly
 *
 * These tests validate:
 * - Application is accessible
 * - Authentication flow works
 * - Test fixtures and helpers are properly configured
 */
test.describe("E2E Setup Verification", () => {
  test("should load home page", async ({ page }) => {
    await page.goto("/");

    // Verify page title contains expected text
    await expect(page).toHaveTitle(/Tabliczki ZTM/);

    // Verify main navigation is present
    const nav = page.locator("nav");
    await expect(nav).toBeVisible();
  });

  test("should redirect unauthenticated user to login", async ({ page }) => {
    // Try to access protected route
    await page.goto("/dashboard");

    // Should redirect to login page
    await expect(page).toHaveURL(/\/auth\/login/);

    // Verify return URL is preserved
    expect(page.url()).toContain("returnUrl");
  });

  test("should authenticate test user successfully", async ({ page }) => {
    const email = process.env.TEST_USER_EMAIL || "";
    const password = process.env.TEST_USER_PASSWORD || "";

    if (!email || !password) {
      throw new Error("TEST_USER_EMAIL and TEST_USER_PASSWORD must be set");
    }

    // Navigate to login
    await page.goto("/auth/login");

    // Fill credentials
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);

    // Submit form
    await page.click('button[type="submit"]');

    // Should redirect to dashboard after successful login
    await expect(page).toHaveURL("/dashboard");

    // Verify dashboard content is visible
    const heading = page.locator("h1, h2").first();
    await expect(heading).toBeVisible();
  });
});

authenticatedTest.describe("Authenticated User Tests", () => {
  authenticatedTest("should access dashboard when authenticated", async ({ authenticatedPage }) => {
    // authenticatedPage is already logged in via fixture
    await authenticatedPage.goto("/dashboard");

    // Verify we're on dashboard (not redirected to login)
    await expect(authenticatedPage).toHaveURL("/dashboard");

    // Verify dashboard elements are present
    const createButton = authenticatedPage.locator('button:has-text("Dodaj zestaw")');
    await expect(createButton).toBeVisible();
  });

  authenticatedTest("should have clean test state", async ({ authenticatedPage }) => {
    // Navigate to dashboard
    await authenticatedPage.goto("/dashboard");

    // Verify no sets exist (cleanup from previous tests worked)
    const emptyState = authenticatedPage.locator("text=/brak zestawów|nie masz jeszcze/i");
    const setsList = authenticatedPage.locator('[data-testid="set-card"]');

    // Either empty state is shown OR no sets are present
    const hasEmptyState = await emptyState.isVisible().catch(() => false);
    const setsCount = await setsList.count();

    expect(hasEmptyState || setsCount === 0).toBeTruthy();
  });
});
