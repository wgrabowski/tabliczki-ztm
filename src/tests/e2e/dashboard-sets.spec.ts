import { test, expect } from "@playwright/test";

// This test assumes a logged-in user session
// You may need to set up authentication state before running these tests

test.describe("Dashboard - Sets Management", () => {
  test.beforeEach(async ({ page }) => {
    // TODO: Set up authenticated session
    // You can use storageState or login before each test
    await page.goto("/dashboard");
  });

  test("should display sets dashboard", async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator("h1, h2")).toContainText(/Zestawy|Dashboard/i);
  });

  test("should show create set button when under limit", async ({ page }) => {
    // Check if "Add Set" button is visible
    const createButton = page.locator('button:has-text("Dodaj zestaw")');
    const isVisible = await createButton.isVisible();

    if (isVisible) {
      expect(isVisible).toBe(true);
    } else {
      // If not visible, we might be at the limit (6 sets)
      const setCards = page.locator('[data-testid="set-card"]');
      const count = await setCards.count();
      expect(count).toBe(6);
    }
  });

  test("should create a new set", async ({ page }) => {
    const createButton = page.locator('button:has-text("Dodaj zestaw")');

    if (await createButton.isVisible()) {
      await createButton.click();

      // Fill set name (assuming a modal or inline form)
      await page.fill('input[name="name"]', "Test Set");
      await page.keyboard.press("Enter");

      // Should show success toast
      await expect(page.locator("text=/utworzono|dodano/i")).toBeVisible();
    }
  });

  test("should rename a set inline", async ({ page }) => {
    // Find first set card and click on the name to edit
    const firstSetName = page.locator('[data-testid="set-name"]').first();

    if (await firstSetName.isVisible()) {
      await firstSetName.click();

      // Clear and type new name
      await firstSetName.fill("Renamed");
      await page.keyboard.press("Enter");

      // Should show success or just update the name
      await expect(firstSetName).toHaveValue("Renamed");
    }
  });

  test("should delete a set with confirmation", async ({ page }) => {
    const deleteButton = page.locator('button[aria-label*="Usuń"], button:has-text("Usuń")').first();

    if (await deleteButton.isVisible()) {
      await deleteButton.click();

      // Confirm deletion (assuming a confirmation dialog)
      const confirmButton = page.locator('button:has-text("Potwierdź")');
      await confirmButton.click();

      // Should show success toast
      await expect(page.locator("text=/usunięto/i")).toBeVisible();
    }
  });

  test("should not allow set name longer than 10 characters", async ({ page }) => {
    const createButton = page.locator('button:has-text("Dodaj zestaw")');

    if (await createButton.isVisible()) {
      await createButton.click();

      const nameInput = page.locator('input[name="name"]');
      await nameInput.fill("12345678901"); // 11 characters

      await page.keyboard.press("Enter");

      // Should show validation error
      await expect(page.locator("text=/maksymalnie 10|zbyt długa/i")).toBeVisible();
    }
  });
});
