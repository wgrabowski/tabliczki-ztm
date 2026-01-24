import type { APIRoute } from "astro";
import { getUserId } from "../../../../../lib/auth/get-user-id.ts";
import { mapDatabaseError } from "../../../../../lib/errors/db-errors.ts";
import { deleteSetItem, getAllSetItems, verifySetOwnership } from "../../../../../lib/services/set-items.service.ts";
import type { DeleteSetItemResponse, ErrorResponse } from "../../../../../types.ts";

export const prerender = false;

/**
 * Validates if a string is a valid UUID v4
 *
 * @param id - String to validate
 * @returns True if valid UUID v4, false otherwise
 */
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * DELETE /api/sets/{setId}/items/{itemId}
 *
 * Deletes a set item (pinned stop) from a user's set.
 * Returns the updated list of remaining items and the ID of the deleted item.
 *
 * **Security:**
 * - Verifies user authentication
 * - Validates set ownership
 * - Ensures item belongs to the specified set
 *
 * **Response:**
 * - 200 OK: Item deleted successfully, returns updated list
 * - 400 Bad Request: Invalid UUID format
 * - 401 Unauthorized: User not authenticated
 * - 404 Not Found: Set or item not found, or access denied
 * - 500 Internal Server Error: Unexpected database error
 */
export const DELETE: APIRoute = async ({ params, locals }) => {
  // 1. Extract and validate URL parameters
  const { setId, itemId } = params;

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

  if (!itemId || !isValidUUID(itemId)) {
    return new Response(
      JSON.stringify({
        code: "INVALID_INPUT",
        message: "Invalid item ID format",
      } as ErrorResponse),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // 2. Check authentication
  const userIdResult = await getUserId(locals.supabase);

  if (!userIdResult.success) {
    return new Response(JSON.stringify(userIdResult.error), {
      status: userIdResult.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  const userId = userIdResult.userId;

  // 3. Delete item and fetch updated list
  try {
    // 3a. Verify set ownership
    await verifySetOwnership(locals.supabase, userId, setId);

    // 3b. Delete the item with verification
    await deleteSetItem(locals.supabase, setId, itemId);

    // 3c. Fetch updated list of remaining items
    const remainingItems = await getAllSetItems(locals.supabase, setId);

    // 4. Format and return successful response
    const response: DeleteSetItemResponse = {
      items: remainingItems,
      deleted_item_id: itemId,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    // Map database errors to user-friendly responses
    console.error("Error deleting set item:", { userId, setId, itemId, error });
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
