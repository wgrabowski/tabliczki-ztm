import { createClient } from "@supabase/supabase-js";

/**
 * Global teardown for E2E tests
 * Cleans up test user and data from Supabase after tests
 */
export default async function globalTeardown() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn("⚠️  Skipping teardown: Supabase credentials not set");
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const testEmail = "test@example.com";

  try {
    console.log("🧹 Cleaning up E2E test environment...");

    // Find test user
    const { data: users } = await supabase.auth.admin.listUsers();
    const testUser = users?.users.find((u) => u.email === testEmail);

    if (testUser) {
      // Delete test user (this will cascade delete their sets and items due to RLS)
      const { error } = await supabase.auth.admin.deleteUser(testUser.id);

      if (error) {
        console.error("❌ Failed to delete test user:", error.message);
        throw error;
      }

      console.log(`✓ Deleted test user: ${testEmail} (ID: ${testUser.id})`);
    } else {
      console.log(`ℹ️  Test user ${testEmail} not found (already cleaned up?)`);
    }

    console.log("✅ E2E test environment cleaned up");
  } catch (error) {
    console.error("❌ Global teardown failed:", error);
    // Don't throw - teardown failures shouldn't break the build
  }
}
