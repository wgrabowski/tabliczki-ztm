import { test as base, Page } from "@playwright/test";
import { login } from "../helpers/auth.helper";
import { cleanupUserData } from "../helpers/cleanup.helper";

/**
 * Extended test fixture that provides authenticated page
 *
 * Usage:
 * import { test, expect } from '../fixtures/authenticated.fixture';
 *
 * test('my test', async ({ authenticatedPage }) => {
 *   // Page is already logged in and ready to use
 *   await authenticatedPage.goto('/dashboard');
 * });
 */
interface AuthenticatedFixtures {
  authenticatedPage: Page;
}

export const test = base.extend<AuthenticatedFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Setup: login before each test
    await login(page);

    // Run the test
    await use(page);

    // Teardown: cleanup data after each test
    const testUserEmail = process.env.TEST_USER_EMAIL;
    if (testUserEmail) {
      await cleanupUserData(testUserEmail);
    }
  },
});

export { expect } from "@playwright/test";
