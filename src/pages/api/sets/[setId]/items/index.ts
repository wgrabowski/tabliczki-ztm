import type { APIRoute } from "astro";

import { getUserId } from "@lib/auth/get-user-id.ts";
import { mapDatabaseError } from "@lib/errors/db-errors.ts";
import { createSetItem, getAllSetItems, verifySetOwnership } from "@services/set-items.service.ts";
import { createSetItemCommandSchema } from "@lib/validation/sets.validation.ts";
import type { CreateSetItemResponse, ErrorResponse, SetItemListResponse } from "@types";

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
 * GET /api/sets/{setId}/items - Retrieve all items in a set
 *
 * URL Parameters:
 * - setId: UUID of the set
 *
 * Returns:
 * - 200: List of items in the set (ordered by position)
 * - 400: Invalid input (bad UUID format)
 * - 401: Authentication required
 * - 404: Set not found or not owned by user
 * - 500: Unexpected server error
 */
export const GET: APIRoute = async ({ params, locals }) => {
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

  // 3. Retrieve set items
  try {
    // 3a. Verify set ownership (ensures set exists and belongs to user)
    await verifySetOwnership(locals.supabase, userId, setId);

    // 3b. Fetch all items in the set (ordered by position)
    const items = await getAllSetItems(locals.supabase, setId);

    // 4. Format and return successful response
    const response: SetItemListResponse = {
      items,
      total_count: items.length,
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
    console.error("Error retrieving set items:", { userId, setId, error });
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
 * POST /api/sets/{setId}/items - Add a new stop to the set
 *
 * URL Parameters:
 * - setId: UUID of the set
 *
 * Request body:
 * - stop_id: number (positive integer)
 *
 * Returns:
 * - 201: Created item with updated list of all items in set
 * - 400: Invalid input (bad UUID, invalid stop_id, max items exceeded)
 * - 401: Authentication required
 * - 404: Set not found or not owned by user
 * - 409: Stop already exists in this set
 * - 500: Unexpected server error
 */
export const POST: APIRoute = async ({ params, request, locals }) => {
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

  // 3. Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({
        code: "INVALID_INPUT",
        message: "Invalid JSON body",
      } as ErrorResponse),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // 4. Validate input with Zod schema
  const validationResult = createSetItemCommandSchema.safeParse(body);
  if (!validationResult.success) {
    const firstError = validationResult.error.issues[0];
    return new Response(
      JSON.stringify({
        code: "INVALID_STOP_ID",
        message: firstError?.message || "Invalid stop_id",
      } as ErrorResponse),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const { stop_id } = validationResult.data;

  // 5. Create set item and fetch updated list
  try {
    // 5a. Verify set ownership (optional - RLS will also check, but provides better error messages)
    await verifySetOwnership(locals.supabase, userId, setId);

    // 5b. Create the new set item (position auto-assigned by trigger)
    const newItem = await createSetItem(locals.supabase, setId, stop_id);

    // 5c. Fetch updated list of all items in the set
    const allItems = await getAllSetItems(locals.supabase, setId);

    // 6. Format and return successful response
    const response: CreateSetItemResponse = {
      items: allItems,
      created_item: {
        id: newItem.id,
        stop_id: newItem.stop_id,
        position: newItem.position,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    // Map database errors to user-friendly responses
    // eslint-disable-next-line no-console
    console.error("Error creating set item:", { userId, setId, stop_id, error });
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
