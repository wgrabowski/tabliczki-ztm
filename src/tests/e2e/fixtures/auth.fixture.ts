import { test as base, Page } from "@playwright/test";

export interface TestUser {
  email: string;
  password: string;
}

interface TestFixtures {
  authenticatedPage: Page;
  testUser: TestUser;
}

export const test = base.extend<TestFixtures>({
  // eslint-disable-next-line no-empty-pattern
  testUser: async ({}, use) => {
    // Provide test user credentials
    // These should match users in your test database
    const user: TestUser = {
      email: process.env.TEST_USER_EMAIL || "test@example.com",
      password: process.env.TEST_USER_PASSWORD || "testpassword123",
    };
    await use(user);
  },

  authenticatedPage: async ({ page, testUser }, use) => {
    // Log in before tests that need authentication
    await page.goto("/auth/login");
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.click('button[type="submit"]');

    // Wait for successful login (adjust selector as needed)
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });

    await use(page);

    // Logout after test
    await page.goto("/api/auth/logout");
  },
});

export { expect } from "@playwright/test";
