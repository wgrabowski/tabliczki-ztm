import { test, expect } from "@playwright/test";

test.describe("TV View (Public)", () => {
  const testStopId = 117; // Valid stop ID for testing

  test("should display TV view without authentication", async ({ page }) => {
    await page.goto(`/tv/${testStopId}`);

    // Should not redirect to login
    await expect(page).toHaveURL(`/tv/${testStopId}`);

    // Should show stop name or fallback
    await expect(page.locator('h1, [data-testid="stop-name"]')).toBeVisible();
  });

  test("should display clock in HH:mm format", async ({ page }) => {
    await page.goto(`/tv/${testStopId}`);

    const clock = page.locator('[data-testid="clock"], .clock');
    await expect(clock).toBeVisible();

    // Check format: HH:mm
    const clockText = await clock.textContent();
    expect(clockText).toMatch(/^\d{2}:\d{2}$/);
  });

  test("should display departures list", async ({ page }) => {
    await page.goto(`/tv/${testStopId}`);

    // Wait for data to load
    await page.waitForLoadState("networkidle");

    // Should show departures or error state
    const departuresList = page.locator('[data-testid="departures-list"], .departures');
    const errorScreen = page.locator('[data-testid="error-screen"]');

    const hasDepartures = await departuresList.isVisible();
    const hasError = await errorScreen.isVisible();

    expect(hasDepartures || hasError).toBe(true);
  });

  test("should show error screen for invalid stop ID", async ({ page }) => {
    await page.goto("/tv/0"); // Invalid stop ID

    // Should redirect to 404 or show error
    const is404 = page.url().includes("/404");
    const hasError = await page.locator('[data-testid="error-screen"]').isVisible();

    expect(is404 || hasError).toBe(true);
  });

  test("should have theme toggle", async ({ page }) => {
    await page.goto(`/tv/${testStopId}`);

    const themeToggle = page.locator('[data-testid="theme-toggle"], button[aria-label*="motyw"]');
    await expect(themeToggle).toBeVisible();
  });

  test("should show manual reload button on error", async ({ page }) => {
    // Mock API to return error
    await page.route("**/api/ztm/departures**", (route) => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: "Server error" }),
      });
    });

    await page.goto(`/tv/${testStopId}`);

    // Wait for error state
    await page.waitForSelector('[data-testid="error-screen"]', {
      timeout: 10000,
    });

    // Should show reload button
    const reloadButton = page.locator('button:has-text("Odśwież"), button:has-text("Spróbuj ponownie")');
    await expect(reloadButton).toBeVisible();
  });

  test("should have large, readable text for TV display", async ({ page }) => {
    await page.goto(`/tv/${testStopId}`);

    // Check font sizes are suitable for TV
    const heading = page.locator("h1").first();
    const fontSize = await heading.evaluate((el) => window.getComputedStyle(el).getPropertyValue("font-size"));

    // Should be at least 24px (adjust based on your design)
    const size = parseInt(fontSize);
    expect(size).toBeGreaterThanOrEqual(24);
  });
});
