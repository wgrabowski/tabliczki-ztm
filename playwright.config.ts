import { defineConfig, devices } from "@playwright/test";
import { config as dotenvConfig } from "dotenv";
import { resolve } from "path";

// Load test environment variables from .env.test (local) or use environment variables (CI)
if (process.env.CI !== "true") {
  dotenvConfig({ path: resolve(process.cwd(), ".env.test") });
}

/**
 * Playwright E2E Test Configuration
 *
 * Key decisions:
 * - Sequential execution (workers: 1) - single test user
 * - No parallelism - shared test database
 * - Automatic cleanup after each test via fixtures
 */
export default defineConfig({
  testDir: "./src/tests/e2e",

  // Test execution settings
  fullyParallel: false, // Sequential - single user
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // One worker for one test user
  maxFailures: 1, // Stop after first failure

  // Timeouts
  timeout: 120_000, // 120s per test (increased for screenshot tests)
  expect: {
    timeout: 5_000, // 5s for assertions
  },

  // Reporting
  reporter: [
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["list"],
    ...(process.env.CI ? [["github"] as const] : []),
  ],

  // Global configuration
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:4321",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    headless: process.env.HEADLESS !== "false",
    actionTimeout: 10_000, // 10s for actions
  },

  // Browser projects
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    // Uncomment for cross-browser testing in CI
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  // Dev server (automatically starts for local testing)
  webServer: process.env.CI
    ? {
        command: "npm run dev",
        url: "http://localhost:4321",
        reuseExistingServer: false,
        timeout: 120_000,
        stdout: "ignore",
        stderr: "pipe",
        env: {
          SUPABASE_URL: process.env.TEST_SUPABASE_URL || "",
          SUPABASE_KEY: process.env.TEST_SUPABASE_KEY || "",
          SUPABASE_SERVICE_ROLE_KEY: process.env.TEST_SUPABASE_SERVICE_ROLE_KEY || "",
        },
      }
    : {
        command: "npm run dev:test",
        url: "http://localhost:4321",
        reuseExistingServer: false,
        timeout: 120_000,
        stdout: "ignore",
        stderr: "pipe",
        env: {
          SUPABASE_URL: process.env.TEST_SUPABASE_URL || "",
          SUPABASE_KEY: process.env.TEST_SUPABASE_KEY || "",
          SUPABASE_SERVICE_ROLE_KEY: process.env.TEST_SUPABASE_SERVICE_ROLE_KEY || "",
        },
      },

  // Global setup and teardown
  globalSetup: "./src/tests/e2e/global-setup.ts",
  globalTeardown: "./src/tests/e2e/global-teardown.ts",
});
