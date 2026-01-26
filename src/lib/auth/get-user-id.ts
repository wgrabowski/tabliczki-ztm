import type { SupabaseClient } from "../../db/supabase.client.ts";
import type { ErrorResponse } from "@types";

/**
 * Result of getUserId operation
 */
export type GetUserIdResult =
  | { success: true; userId: string }
  | { success: false; error: ErrorResponse; status: number };

/**
 * Gets the authenticated user ID from session or development override
 *
 * **Production Mode:**
 * - Always validates JWT token from Supabase session
 * - Returns error if authentication fails
 *
 * @param supabase - Supabase client instance
 * @returns User ID or error response
 *
 * @example
 * ```ts
 * const result = await getUserId(locals.supabase);
 * if (!result.success) {
 *   return new Response(JSON.stringify(result.error), { status: result.status });
 * }
 * const userId = result.userId;
 * ```
 */
export async function getUserId(supabase: SupabaseClient): Promise<GetUserIdResult> {
  // Production mode: Validate JWT token
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required",
      },
      status: 401,
    };
  }

  return { success: true, userId: user.id };
}
