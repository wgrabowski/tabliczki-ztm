import { test, expect } from "@playwright/test";

test.describe("Authentication Flow", () => {
  test("should show login page for unauthenticated users", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test("should redirect to returnUrl after successful login", async ({ page }) => {
    // Navigate to protected page (should redirect to login with returnUrl)
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/returnUrl/);

    // Fill login form
    await page.fill('input[name="email"]', "test@example.com");
    await page.fill('input[name="password"]', "password123");

    // Submit form
    await page.click('button[type="submit"]');

    // Should redirect back to dashboard after successful login
    // Note: This test requires a valid test user in the database
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("should show error message for invalid credentials", async ({ page }) => {
    await page.goto("/auth/login");

    await page.fill('input[name="email"]', "invalid@example.com");
    await page.fill('input[name="password"]', "wrongpassword");
    await page.click('button[type="submit"]');

    // Should show error toast or message
    await expect(page.locator("text=/Błędne dane logowania/i")).toBeVisible();
  });

  test("should validate email format on registration", async ({ page }) => {
    await page.goto("/auth/register");

    await page.fill('input[name="email"]', "not-an-email");
    await page.fill('input[name="password"]', "password123");

    // Try to submit
    await page.click('button[type="submit"]');

    // Browser validation or custom error should appear
    const emailInput = page.locator('input[name="email"]');
    await expect(emailInput).toHaveAttribute("type", "email");
  });

  test("should validate password length on registration", async ({ page }) => {
    await page.goto("/auth/register");

    await page.fill('input[name="email"]', "test@example.com");
    await page.fill('input[name="password"]', "12345"); // Too short

    await page.click('button[type="submit"]');

    // Should show validation error
    await expect(page.locator("text=/minimum 6 znaków/i, text=/co najmniej 6/i")).toBeVisible();
  });
});
