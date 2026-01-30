import { cleanupUserData } from "./helpers/cleanup.helper";

/**
 * Global teardown for E2E tests
 * Performs final cleanup after all tests complete
 */
/* eslint-disable no-console */
export default async function globalTeardown() {
  try {
    // Final cleanup of test user data
    const testUserEmail = process.env.TEST_USER_EMAIL;
    if (testUserEmail) {
      await cleanupUserData(testUserEmail);
    }
  } catch (error) {
    console.error("Error: Teardown cleanup failed:", error);
    // Don't throw - allow tests to complete even if cleanup fails
  }
}
