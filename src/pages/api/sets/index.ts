import type { APIRoute } from "astro";

import { getUserId } from "../../../lib/auth/get-user-id.ts";
import { mapDatabaseError } from "../../../lib/errors/db-errors.ts";
import { createSet, getAllUserSetsWithCounts } from "../../../lib/services/sets.service.ts";
import { createSetCommandSchema } from "../../../lib/validation/sets.validation.ts";
import type { CreateSetResponse, ErrorResponse } from "../../../types.ts";

/**
 * Disable prerendering for this API endpoint
 * Required for dynamic API routes that interact with authentication and database
 */
export const prerender = false;

/**
 * POST /api/sets - Create a new set for the authenticated user
 *
 * Request body:
 * - name: string (1-10 characters after trimming)
 *
 * Returns:
 * - 201: Created set with updated list of all user's sets
 * - 400: Invalid input or business logic error (max sets exceeded)
 * - 401: Authentication required
 * - 409: Duplicate set name
 * - 500: Unexpected server error
 */
export const POST: APIRoute = async ({ request, locals }) => {
  // 1. Check authentication
  // Get user_id from session (or DEV_USER_ID in development mode)
  // NEVER trust user_id from client input!
  const userIdResult = await getUserId(locals.supabase);

  if (!userIdResult.success) {
    return new Response(JSON.stringify(userIdResult.error), {
      status: userIdResult.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  const userId = userIdResult.userId;

  // 2. Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({
        code: "INVALID_SET_NAME",
        message: "Invalid JSON body",
      } as ErrorResponse),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // 3. Validate input with Zod schema
  const validationResult = createSetCommandSchema.safeParse(body);
  if (!validationResult.success) {
    const firstError = validationResult.error.issues[0];
    return new Response(
      JSON.stringify({
        code: "INVALID_SET_NAME",
        message: firstError?.message || "Invalid input",
      } as ErrorResponse),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const { name } = validationResult.data;

  // 4. Create set and fetch updated list
  try {
    // Create the new set (name is already trimmed by Zod schema)
    const newSet = await createSet(locals.supabase, userId, name);

    // Fetch updated list of all user's sets with item counts
    const allSets = await getAllUserSetsWithCounts(locals.supabase, userId);

    // 5. Format and return successful response
    const response: CreateSetResponse = {
      sets: allSets,
      created_set: {
        id: newSet.id,
        name: newSet.name,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    // Map database errors to user-friendly responses
    // eslint-disable-next-line no-console
    console.error("Error creating set:", error);
    const mappedError = mapDatabaseError(error);

    return new Response(
      JSON.stringify({
        code: mappedError.code,
        message: mappedError.message,
      } as ErrorResponse),
      {
        status: mappedError.status,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
