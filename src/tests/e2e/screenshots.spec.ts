import { test, expect, type Page } from "@playwright/test";
import { login } from "./helpers/auth.helper";
import { cleanupUserData } from "./helpers/cleanup.helper";
import { mkdir } from "fs/promises";
import { join } from "path";

/**
 * Screenshot generation test suite
 * Captures all business functionality screens in multiple variants:
 * - Desktop (1920x1080) / Mobile (390x844)
 * - Light / Dark theme
 *
 * Strategy: Run all scenarios linearly for each viewport+theme combination
 * without unnecessary page navigation
 */

const VIEWPORTS = {
  desktop: { width: 1920, height: 1080 },
  mobile: { width: 390, height: 844 },
} as const;

const THEMES = ["light", "dark"] as const;

type Viewport = keyof typeof VIEWPORTS;
type Theme = (typeof THEMES)[number];

/**
 * Test data configuration - parameterized for easy maintenance
 */
const TEST_DATA = {
  sets: {
    names: ["Robota", "Dom", "Oliwa", "Politechnika", "Plaża Jelitkowo", "Plaża Brzeźno"],
    nameToRename: "Dom", // Which set to rename (by name)
    nameToDelete: "Plaża Jelitkowo", // Which set to delete (by name)
    nameToOpenForStops: "Robota", // Which set to open for stops management (by name)
    renamedName: "Praca",
  },
  stops: {
    queries: [
      "Dworzec Główny 07",
      "Plac Solidarności 01",
      "Plac Solidarności 02",
      "Brama Oliwska 01",
      "Brama Oliwska 02",
      "Dworzec Główny 01",
    ],
    indexToDelete: 0, // Which stop to attempt deletion (0-based index, for screenshot only)
    indexForTvView: 3, // Which stop to use for TV view (0-based index)
  },
  timeouts: {
    short: 500,
    medium: 1000,
    long: 2000,
    screenshot: 300,
  },
} as const;

/**
 * Set theme by clicking the theme toggle button
 */
async function setTheme(page: Page, theme: Theme): Promise<void> {
  const currentTheme = await page.evaluate(() => {
    return document.documentElement.style.colorScheme || "light";
  });

  if (currentTheme !== theme) {
    const themeToggle = page.locator('[data-testid="theme-toggle"]');
    await themeToggle.click({ force: true });
    await page.waitForTimeout(TEST_DATA.timeouts.short);
  }
}

/**
 * Capture single screenshot for current viewport and theme
 */
async function captureScreenshot(
  page: Page,
  viewport: Viewport,
  theme: Theme,
  screenshotName: string,
  options?: {
    fullPage?: boolean;
    waitForSelector?: string;
  }
): Promise<void> {
  if (options?.waitForSelector) {
    await page.waitForSelector(options.waitForSelector, { timeout: 5000 });
  }

  await page.waitForTimeout(300);

  const screenshotDir = join(process.cwd(), "screenshots", viewport, theme);
  await mkdir(screenshotDir, { recursive: true });

  const filename = `${viewport}-${theme}-${screenshotName}.png`;
  const filepath = join(screenshotDir, filename);

  await page.screenshot({
    path: filepath,
    fullPage: options?.fullPage ?? false,
  });

  console.log(`${viewport}/${theme}/${filename}`);
}

/**
 * Run all test scenarios for a specific viewport and theme combination
 * Linear flow without unnecessary navigation
 */
async function runAllScenarios(page: Page, viewport: Viewport, theme: Theme): Promise<void> {
  // Navigate to dashboard once
  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(TEST_DATA.timeouts.medium);
  await page.waitForSelector('[data-testid="create-set-button"]', { timeout: 10000 });

  // Step 1: Screenshot empty dashboard
  await captureScreenshot(page, viewport, theme, "02-dashboard-01-empty-list");

  // Step 2: Click add set button, fill name, take screenshot
  await page.click('[data-testid="create-set-button"]');
  await page.waitForSelector('[data-testid="create-set-dialog"]', { timeout: 5000 });
  await page.waitForTimeout(TEST_DATA.timeouts.short);
  await page.fill('[data-testid="create-set-name-input"]', TEST_DATA.sets.names[0]);
  await page.waitForTimeout(TEST_DATA.timeouts.short);
  await captureScreenshot(page, viewport, theme, "02-dashboard-02-add-set", {
    waitForSelector: '[data-testid="create-set-dialog"]',
  });

  // Step 3: Confirm adding set
  await page.click('[data-testid="create-set-submit"]');
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(TEST_DATA.timeouts.long);

  // Step 3.5: Screenshot dashboard with one set added
  await captureScreenshot(page, viewport, theme, "02-dashboard-03-one-set-added");

  // Step 3.6: Add 5 more sets to show full list (6 total)
  for (let i = 1; i < 6; i++) {
    await page.click('[data-testid="create-set-button"]');
    await page.waitForSelector('[data-testid="create-set-dialog"]', { timeout: 5000 });
    await page.fill('[data-testid="create-set-name-input"]', TEST_DATA.sets.names[i]);
    await page.click('[data-testid="create-set-submit"]');
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(TEST_DATA.timeouts.medium);
  }

  // Step 3.7: Screenshot dashboard with full list of 6 sets
  await captureScreenshot(page, viewport, theme, "02-dashboard-04-full-list");

  // Step 4: Enable rename mode, change name, take screenshot
  const setCardToRename = page.locator(`[data-testid="set-card"][data-set-name="${TEST_DATA.sets.nameToRename}"]`);
  const editButton = setCardToRename.locator('[data-testid="set-edit-button"]');
  await editButton.waitFor({ state: "visible", timeout: 5000 });
  await editButton.click();
  await page.waitForSelector('[data-testid="set-edit-form"]', { timeout: 5000 });
  await page.waitForTimeout(TEST_DATA.timeouts.short);
  const nameInput = setCardToRename.locator('[data-testid="set-name-input"]');
  await nameInput.clear();
  await nameInput.fill(TEST_DATA.sets.renamedName);
  await page.waitForTimeout(TEST_DATA.timeouts.short);
  await captureScreenshot(page, viewport, theme, "02-dashboard-05-rename-set");

  // Step 5: Confirm rename
  const saveButton = setCardToRename.locator('[data-testid="set-save-button"]');
  await saveButton.click();
  await page.waitForTimeout(TEST_DATA.timeouts.medium);

  // Step 6: Click delete icon on specified set, take screenshot
  const setCardToDelete = page.locator(`[data-testid="set-card"][data-set-name="${TEST_DATA.sets.nameToDelete}"]`);
  const deleteButton = setCardToDelete.locator('[data-testid="set-delete-button"]');
  await deleteButton.waitFor({ state: "visible", timeout: 5000 });
  await deleteButton.click();
  await page.waitForSelector('[data-testid="confirm-dialog"]', { timeout: 5000 });
  await page.waitForTimeout(TEST_DATA.timeouts.short);
  await captureScreenshot(page, viewport, theme, "02-dashboard-06-delete-set");

  // Step 7: Confirm deletion of specified set
  const confirmDeleteButton = page.locator('[data-testid="confirm-button"]');
  await confirmDeleteButton.click();
  await page.waitForTimeout(TEST_DATA.timeouts.long);

  // Step 7.5: Screenshot dashboard after deletion (5 sets remaining)
  await captureScreenshot(page, viewport, theme, "02-dashboard-07-after-delete");

  // Step 8: Click link in specified set to go to stops view
  const setCardToOpen = page.locator(`[data-testid="set-card"][data-set-name="${TEST_DATA.sets.nameToOpenForStops}"]`);
  const viewButton = setCardToOpen.locator('[data-testid="set-view-button"]');
  await viewButton.click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(TEST_DATA.timeouts.medium);

  // Step 9: Screenshot empty stops list
  await page.waitForSelector('[data-testid="add-stop-button"]', { timeout: 5000 });
  await captureScreenshot(page, viewport, theme, "03-dashboard-set-01-empty-list");

  // Step 10: Click add button, modal opens, fill name, take screenshot
  await page.click('[data-testid="add-stop-button"]');
  await page.waitForSelector('[data-testid="add-stop-dialog"]', { timeout: 5000 });
  const searchInput = page.locator('[data-testid="add-stop-search"]');
  await searchInput.fill(TEST_DATA.stops.queries[0]);
  // Wait for autocomplete results to appear
  await page.waitForSelector('[data-testid="autocomplete-option"]', { timeout: 5000 });
  await page.waitForTimeout(TEST_DATA.timeouts.short);
  await captureScreenshot(page, viewport, theme, "03-dashboard-set-02-add-stop", {
    waitForSelector: '[data-testid="add-stop-dialog"]',
  });

  // Step 11: Select specific stop from list, save
  const firstResult = page.locator('[data-testid="autocomplete-option"]').first();
  await firstResult.click();
  await page.waitForTimeout(TEST_DATA.timeouts.short);
  // add confirmation by clicking save button
  const modalSaveButton = page.locator('[data-testid="add-stop-submit"]');
  await modalSaveButton.waitFor({ state: "visible", timeout: 5000 });
  await expect(modalSaveButton).toBeEnabled({ timeout: 5000 });
  await modalSaveButton.click();
  await page.waitForSelector('[data-testid="add-stop-dialog"]', { state: "hidden", timeout: 15000 });
  await page.waitForTimeout(TEST_DATA.timeouts.medium);

  // Step 11.5: Screenshot set view with one stop added
  await captureScreenshot(page, viewport, theme, "03-dashboard-set-03-one-stop-added");

  // Step 11.6: Add 5 more stops to show full list (6 total)
  for (let i = 1; i < 6; i++) {
    await page.click('[data-testid="add-stop-button"]');
    await page.waitForSelector('[data-testid="add-stop-dialog"]', { timeout: 5000 });
    const stopSearchInput = page.locator('[data-testid="add-stop-search"]');
    await stopSearchInput.fill(TEST_DATA.stops.queries[i]);
    // Wait for autocomplete results to appear
    await page.waitForSelector('[data-testid="autocomplete-option"]', { timeout: 5000 });
    const stopResult = page.locator('[data-testid="autocomplete-option"]').first();
    await stopResult.click();
    await page.waitForTimeout(TEST_DATA.timeouts.short);
    const modalSaveButton = page.locator('[data-testid="add-stop-submit"]');
    await modalSaveButton.waitFor({ state: "visible", timeout: 5000 });
    await expect(modalSaveButton).toBeEnabled({ timeout: 5000 });
    await modalSaveButton.click();
    await page.waitForSelector('[data-testid="add-stop-dialog"]', { state: "hidden", timeout: 15000 });
    await page.waitForTimeout(TEST_DATA.timeouts.short);
  }

  // Step 11.7: Screenshot set view with full list of 6 stops
  await page.waitForTimeout(TEST_DATA.timeouts.medium);
  await captureScreenshot(page, viewport, theme, "03-dashboard-set-04-full-list");

  // Step 12: Click delete stop button, modal appears, take screenshot
  const deleteStopButton = page.locator('[data-testid="stop-delete-button"]').nth(TEST_DATA.stops.indexToDelete);
  await deleteStopButton.waitFor({ state: "visible", timeout: 5000 });
  await deleteStopButton.click();
  await page.waitForSelector('[data-testid="confirm-dialog"]', { timeout: 5000 });
  await page.waitForTimeout(TEST_DATA.timeouts.short);
  await captureScreenshot(page, viewport, theme, "03-dashboard-set-05-delete-stop");

  // Step 13: Cancel deletion, close modal
  const cancelButton = page.locator('[data-testid="cancel-button"]');
  await cancelButton.click();
  await page.waitForTimeout(TEST_DATA.timeouts.short);

  // Step 13.5: Delete another stop to show list after deletion
  const deleteStopButton2 = page.locator('[data-testid="stop-delete-button"]').last();
  await deleteStopButton2.waitFor({ state: "visible", timeout: 5000 });
  await deleteStopButton2.click();
  await page.waitForSelector('[data-testid="confirm-dialog"]', { timeout: 5000 });
  await page.waitForTimeout(TEST_DATA.timeouts.short);
  const confirmButton = page.locator('[data-testid="confirm-button"]');
  await confirmButton.click();
  await page.waitForTimeout(TEST_DATA.timeouts.long);

  // Step 13.6: Screenshot list after deletion (5 stops remaining)
  await captureScreenshot(page, viewport, theme, "03-dashboard-set-06-after-delete");

  // Step 14: Check TV button address, open in current window, take screenshot
  const stopCard = page.locator('[data-testid="stop-card"]').nth(TEST_DATA.stops.indexForTvView);
  await stopCard.waitFor({ state: "visible", timeout: 5000 });
  const stopId = await stopCard.getAttribute("data-stop-id");
  if (!stopId) {
    throw new Error("Could not find stop ID from stop card");
  }
  const tvUrl = `/tv/${stopId}`;
  await page.goto(tvUrl);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(TEST_DATA.timeouts.long);
  await captureScreenshot(page, viewport, theme, "04-tv-view", { fullPage: true });

  // Step 15: Go back, go to account, logout, redirected to login, take screenshot
  await page.goBack();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(TEST_DATA.timeouts.medium);
  await page.goto("/account");
  await page.waitForLoadState("networkidle");
  await page.click('[data-testid="logout-button"]');
  await page.waitForURL((url) => url.pathname.startsWith("/auth/login"), { timeout: 10000 });
  await page.waitForSelector('[data-testid="login-form"]', { timeout: 5000 });
  await page.waitForTimeout(TEST_DATA.timeouts.short);
  await captureScreenshot(page, viewport, theme, "01-login");
}

// Main test suite - one test per viewport+theme combination
// @screenshots tag prevents this from running with regular E2E tests
test.describe.serial("Screenshots Generation @screenshots", () => {
  let sharedPage: Page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    sharedPage = await context.newPage();

    // Cleanup before starting
    const testUserEmail = process.env.TEST_USER_EMAIL;
    if (testUserEmail) {
      await cleanupUserData(testUserEmail);
    }

    // Login once
    await login(sharedPage);
  });

  test.afterAll(async () => {
    // Final cleanup
    const testUserEmail = process.env.TEST_USER_EMAIL;
    if (testUserEmail) {
      await cleanupUserData(testUserEmail);
    }

    if (sharedPage) {
      await sharedPage.context().close();
    }
  });

  // Create one test for each viewport+theme combination
  for (const viewport of Object.keys(VIEWPORTS) as Viewport[]) {
    for (const theme of THEMES) {
      test(`${viewport} / ${theme}`, async () => {
        // Set viewport and theme at the beginning
        await sharedPage.setViewportSize(VIEWPORTS[viewport]);
        await sharedPage.goto("/dashboard");
        await sharedPage.waitForLoadState("networkidle");
        await setTheme(sharedPage, theme);

        // Run all scenarios
        await runAllScenarios(sharedPage, viewport, theme);

        // Cleanup after this combination
        const testUserEmail = process.env.TEST_USER_EMAIL;
        if (testUserEmail) {
          await cleanupUserData(testUserEmail);
        }

        // Re-login for next combination (last scenario logs out for login screenshot)
        if (!(viewport === "mobile" && theme === "dark")) {
          await login(sharedPage);
        }
      });
    }
  }
});
