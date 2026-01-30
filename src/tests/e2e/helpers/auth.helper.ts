import { Page } from "@playwright/test";

/**
 * Login to the application using test user credentials
 */
export async function login(page: Page): Promise<void> {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;

  if (!email || !password) {
    throw new Error("TEST_USER_EMAIL and TEST_USER_PASSWORD must be set");
  }

  await page.goto("/auth/login");

  // Fill login form
  await page.fill('[data-testid="login-email-input"]', email);
  await page.fill('[data-testid="login-password-input"]', password);

  // Submit form
  await page.click('[data-testid="login-submit-button"]');

  // Wait for redirect to dashboard
  await page.waitForURL("/dashboard", { timeout: 10_000 });
}

/**
 * Logout from the application
 */
export async function logout(page: Page): Promise<void> {
  await page.goto("/account");
  await page.click('[data-testid="logout-button"]');
  await page.waitForURL("/", { timeout: 5_000 });
}

/**
 * Check if user is authenticated by checking for redirect to login
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  try {
    await page.goto("/dashboard", { waitUntil: "networkidle" });
    return page.url().includes("/dashboard");
  } catch {
    return false;
  }
}
