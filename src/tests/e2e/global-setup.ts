/**
 * Global setup for E2E tests
 * Validates test environment before running tests
 */
/* eslint-disable no-console */
export default async function globalSetup() {
  // Validate required environment variables
  const requiredEnvVars = [
    "TEST_SUPABASE_URL",
    "TEST_SUPABASE_KEY",
    "TEST_SUPABASE_SERVICE_ROLE_KEY",
    "TEST_USER_EMAIL",
    "TEST_USER_PASSWORD",
  ];

  const missing = requiredEnvVars.filter((envVar) => !process.env[envVar]);

  if (missing.length > 0) {
    throw new Error(
      `Error: Missing required environment variables: ${missing.join(", ")}\n` +
        `   Please create .env.test file based on .env.test.example`
    );
  }

  // Verify test user can authenticate
  const baseUrl = process.env.BASE_URL || "http://localhost:4321";

  try {
    // Wait for server to be ready
    await waitForServer(baseUrl);

    // Verify test user credentials
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: process.env.TEST_USER_EMAIL,
        password: process.env.TEST_USER_PASSWORD,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Unknown error" }));
      throw new Error(
        `Test user authentication failed: ${error.message || response.statusText}\n` +
          `   Please verify credentials in .env.test or create the user manually in Supabase`
      );
    }
  } catch (error) {
    console.error("Error: Global setup failed:", error);
    throw error;
  }
}

/**
 * Wait for server to be ready
 */
async function waitForServer(baseUrl: string, timeoutMs = 30_000): Promise<void> {
  const startTime = Date.now();
  let lastError: Error | undefined;

  while (Date.now() - startTime < timeoutMs) {
    try {
      const response = await fetch(baseUrl, { method: "HEAD" });
      if (response.ok || response.status === 404) {
        return;
      }
    } catch (error) {
      lastError = error as Error;
      // Server not ready yet, continue waiting
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Server failed to start within ${timeoutMs}ms. Last error: ${lastError?.message || "Unknown"}`);
}
