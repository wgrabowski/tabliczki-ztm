import type { APIRoute } from "astro";

import { getUserId } from "@lib/auth/get-user-id.ts";
import { mapDatabaseError } from "@lib/errors/db-errors.ts";
import { createSet, getAllUserSetsWithCounts } from "@services/sets.service.ts";
import { createSetCommandSchema, getSetsQuerySchema } from "@lib/validation/sets.validation.ts";
import type { CreateSetResponse, ErrorResponse, SetListResponse } from "@types";

/**
 * Disable prerendering for this API endpoint
 * Required for dynamic API routes that interact with authentication and database
 */
export const prerender = false;

/**
 * GET /api/sets - Retrieve all sets for the authenticated user
 *
 * Query parameters:
 * - include_items: boolean (optional, default: false) - Reserved for future use
 *
 * Returns:
 * - 200: List of user's sets with item counts and total count
 * - 400: Invalid query parameters
 * - 401: Authentication required
 * - 500: Unexpected server error
 */
export const GET: APIRoute = async ({ url, locals }) => {
  try {
    // 1. Validate query parameters
    const validationResult = getSetsQuerySchema.safeParse(Object.fromEntries(url.searchParams));

    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          code: "INVALID_INPUT",
          message: "Invalid query parameter format",
          details: validationResult.error.errors,
        } as ErrorResponse),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 2. Check authentication
    // Get user_id from session
    // NEVER trust user_id from client input!
    const userIdResult = await getUserId(locals.supabase);

    if (!userIdResult.success) {
      return new Response(JSON.stringify(userIdResult.error), {
        status: userIdResult.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    const userId = userIdResult.userId;

    // 3. Fetch all user's sets with item counts
    const sets = await getAllUserSetsWithCounts(locals.supabase, userId);

    // 4. Format and return successful response
    const response: SetListResponse = {
      sets,
      total_count: sets.length,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error: unknown) {
    // Handle unexpected errors
    // eslint-disable-next-line no-console
    console.error("Error in GET /api/sets:", error);

    return new Response(
      JSON.stringify({
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      } as ErrorResponse),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

/**
 * POST /api/sets - Create a new set for the authenticated user
 *
 * Request body:
 * - name: string (1-20 characters after trimming)
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
  // Get user_id from session
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
