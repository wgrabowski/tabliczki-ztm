import { createClient } from "@supabase/supabase-js";

/**
 * Global setup for E2E tests
 * Creates test user in Supabase before running tests
 */
export default async function globalSetup() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn("⚠️  SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set. E2E tests requiring auth will fail.");
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const testEmail = "test@example.com";
  const testPassword = "password123";

  try {
    console.log("🔧 Setting up E2E test environment...");

    // Check if test user already exists
    const { data: existingUser } = await supabase.auth.admin.listUsers();
    const userExists = existingUser?.users.some((u) => u.email === testEmail);

    if (userExists) {
      console.log(`✓ Test user ${testEmail} already exists`);
    } else {
      // Create test user
      const { data, error } = await supabase.auth.admin.createUser({
        email: testEmail,
        password: testPassword,
        email_confirm: true, // Auto-confirm email for testing
      });

      if (error) {
        console.error("❌ Failed to create test user:", error.message);
        throw error;
      }

      console.log(`✓ Created test user: ${testEmail} (ID: ${data.user?.id})`);
    }

    console.log("✅ E2E test environment ready");
  } catch (error) {
    console.error("❌ Global setup failed:", error);
    throw error;
  }
}
