import { createClient, User } from "@supabase/supabase-js";

/**
 * Get Supabase client with service role key for cleanup operations
 */
function getSupabaseAdminClient() {
  const supabaseUrl = process.env.TEST_SUPABASE_URL;
  const serviceRoleKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("TEST_SUPABASE_URL and TEST_SUPABASE_SERVICE_ROLE_KEY must be set for cleanup operations");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Clean up all sets and set items for a specific user
 * Uses service role key to bypass RLS
 */
/* eslint-disable no-console */
export async function cleanupUserData(userEmail: string): Promise<void> {
  const supabase = getSupabaseAdminClient();

  try {
    // 1. Get user by email
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers();

    if (userError) {
      throw new Error(`Failed to list users: ${userError.message}`);
    }

    const user = userData?.users.find((u: User) => u.email === userEmail);

    if (!user) {
      console.log(`ℹ️  User ${userEmail} not found - skipping cleanup`);
      return;
    }

    // 2. Delete all sets (cascade will delete set_items)
    const { error: deleteError } = await supabase.from("sets").delete().eq("user_id", user.id);

    if (deleteError) {
      throw new Error(`Failed to delete sets: ${deleteError.message}`);
    }

    console.log(`✓ Cleaned up data for user: ${userEmail}`);
  } catch (error) {
    console.error(`❌ Cleanup failed for ${userEmail}:`, error);
    throw error;
  }
}

/**
 * Verify test database is clean (for debugging)
 */
export async function verifyCleanState(userEmail: string): Promise<boolean> {
  const supabase = getSupabaseAdminClient();

  try {
    const { data: userData } = await supabase.auth.admin.listUsers();
    const user = userData?.users.find((u: User) => u.email === userEmail);

    if (!user) return true;

    const { data: sets } = await supabase.from("sets").select("id").eq("user_id", user.id);

    return !sets || sets.length === 0;
  } catch {
    return false;
  }
}
