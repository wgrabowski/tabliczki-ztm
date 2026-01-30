/**
 * Global setup for E2E tests
 * Validates test environment before running tests
 */
/* eslint-disable no-console */
export default async function globalSetup() {
  console.log("🧪 E2E Test Environment Setup");

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
      `❌ Missing required environment variables: ${missing.join(", ")}\n` +
        `   Please create .env.test file based on .env.test.example`
    );
  }

  console.log(`✓ Environment variables validated`);
  console.log(`✓ Test user: ${process.env.TEST_USER_EMAIL}`);
  console.log(`✓ Supabase URL: ${process.env.TEST_SUPABASE_URL}`);
  console.log(`✓ Base URL: ${process.env.BASE_URL || "http://localhost:4321"}`);

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

    console.log("✅ Test user authentication verified");
  } catch (error) {
    console.error("❌ Global setup failed:", error);
    throw error;
  }

  console.log("✅ E2E test environment ready\n");
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
        console.log("✓ Server is ready");
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
