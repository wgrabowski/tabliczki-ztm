import type { APIRoute } from "astro";

import { getUserId } from "@lib/auth/get-user-id.ts";
import { mapDatabaseError } from "@lib/errors/db-errors.ts";
import { deleteSet, getAllUserSetsWithCounts, updateSet } from "@services/sets.service.ts";
import { updateSetCommandSchema } from "@lib/validation/sets.validation.ts";
import type { DeleteSetResponse, ErrorResponse, UpdateSetResponse } from "@types";

/**
 * Disable prerendering for this API endpoint
 * Required for dynamic API routes that interact with authentication and database
 */
export const prerender = false;

/**
 * Helper function to validate UUID format
 * @param id - String to validate as UUID
 * @returns true if valid UUID format, false otherwise
 */
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * PATCH /api/sets/{setId} - Update (rename) an existing set
 *
 * URL Parameters:
 * - setId: UUID of the set to update
 *
 * Request body:
 * - name: string (1-20 characters after trimming)
 *
 * Returns:
 * - 200: Updated set with refreshed list of all user's sets
 * - 400: Invalid input (bad UUID, invalid name)
 * - 401: Authentication required
 * - 404: Set not found or not owned by user
 * - 409: Duplicate set name
 * - 500: Unexpected server error
 */
export const PATCH: APIRoute = async ({ params, request, locals }) => {
  // 1. Extract and validate setId from URL params
  const { setId } = params;

  if (!setId || !isValidUUID(setId)) {
    return new Response(
      JSON.stringify({
        code: "INVALID_SET_NAME",
        message: "Invalid set ID format",
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

  // 3. Parse and validate request body
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

  // 4. Validate input with Zod schema
  const validationResult = updateSetCommandSchema.safeParse(body);
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

  // 5. Update set and fetch updated list
  try {
    // Update the set (name is already trimmed by Zod schema)
    const updatedSet = await updateSet(locals.supabase, userId, setId, name);

    // Fetch updated list of all user's sets with item counts
    const allSets = await getAllUserSetsWithCounts(locals.supabase, userId);

    // 6. Format and return successful response
    const response: UpdateSetResponse = {
      sets: allSets,
      updated_set: {
        id: updatedSet.id,
        name: updatedSet.name,
      },
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
    // Map database errors to user-friendly responses
    // eslint-disable-next-line no-console
    console.error("Error updating set:", { userId, setId, error });
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

/**
 * DELETE /api/sets/{setId} - Delete a set and all its items
 *
 * URL Parameters:
 * - setId: UUID of the set to delete
 *
 * Returns:
 * - 200: Set deleted successfully with updated list of remaining sets
 * - 400: Invalid input (bad UUID format)
 * - 401: Authentication required
 * - 404: Set not found or not owned by user
 * - 500: Unexpected server error
 */
export const DELETE: APIRoute = async ({ params, locals }) => {
  // 1. Extract and validate setId from URL params
  const { setId } = params;

  if (!setId || !isValidUUID(setId)) {
    return new Response(
      JSON.stringify({
        code: "INVALID_INPUT",
        message: "Invalid set ID format",
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

  // 3. Delete set and fetch updated list
  try {
    // Delete the set (cascade deletes all set_items automatically)
    await deleteSet(locals.supabase, userId, setId);

    // Fetch updated list of remaining user's sets with item counts
    const allSets = await getAllUserSetsWithCounts(locals.supabase, userId);

    // 4. Format and return successful response
    const response: DeleteSetResponse = {
      sets: allSets,
      deleted_set_id: setId,
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
    // Map database errors to user-friendly responses
    // eslint-disable-next-line no-console
    console.error("Error deleting set:", { userId, setId, error });
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
