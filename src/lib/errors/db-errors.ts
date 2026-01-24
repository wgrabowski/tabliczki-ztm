import type { ErrorCode } from "../../types.ts";

/**
 * Error mapping result with HTTP status code
 */
export interface MappedError {
  code: ErrorCode;
  message: string;
  status: number;
}

/**
 * Maps database errors to user-friendly error responses
 *
 * Handles specific PostgreSQL error codes and constraint violations:
 * - 23505: Unique constraint violation (duplicate set name)
 * - PGRST116: PostgREST error for no rows returned (set not found)
 * - SET_NOT_FOUND: Custom error from service layer
 * - Custom trigger messages for business logic errors (max sets)
 *
 * @param error - Error object from database operation
 * @returns Mapped error with appropriate code, message, and HTTP status
 */
export function mapDatabaseError(error: { code: string; constraint: string; message: string }): MappedError {
  // Set not found - explicit error from service layer
  if (error.code === "SET_NOT_FOUND" || error.message === "SET_NOT_FOUND") {
    return {
      code: "SET_NOT_FOUND",
      message: "Set not found or access denied",
      status: 404,
    };
  }

  // PostgREST "no rows" error
  if (error.code === "PGRST116") {
    return {
      code: "SET_NOT_FOUND",
      message: "Set not found or access denied",
      status: 404,
    };
  }

  // Duplicate name - unique constraint violation on user_id + btrim(name)
  if (
    error.code === "23505" &&
    (error.constraint?.includes("btrim_name_uniq") || error.message?.includes("sets_user_id_btrim_name_uniq"))
  ) {
    return {
      code: "DUPLICATE_SET_NAME",
      message: "A set with this name already exists",
      status: 409,
    };
  }

  // Max sets per user exceeded - trigger raises exception
  if (error.message?.includes("MAX_SETS_PER_USER_EXCEEDED")) {
    return {
      code: "MAX_SETS_PER_USER_EXCEEDED",
      message: "Maximum number of sets (6) reached for this user",
      status: 400,
    };
  }

  // Duplicate stop_id in set - unique constraint violation
  if (
    error.code === "23505" &&
    (error.constraint === "set_items_set_id_stop_id_uniq" || error.message?.includes("set_items_set_id_stop_id_uniq"))
  ) {
    return {
      code: "SET_ITEM_ALREADY_EXISTS",
      message: "This stop is already added to the set",
      status: 409,
    };
  }

  // Max items per set exceeded - trigger raises exception
  if (error.message?.includes("MAX_ITEMS_PER_SET_EXCEEDED")) {
    return {
      code: "MAX_ITEMS_PER_SET_EXCEEDED",
      message: "Maximum number of items (6) reached for this set",
      status: 400,
    };
  }

  // Item not found - custom error from service layer (for future DELETE)
  if (error.code === "ITEM_NOT_FOUND" || error.message === "ITEM_NOT_FOUND") {
    return {
      code: "ITEM_NOT_FOUND",
      message: "Item not found or access denied",
      status: 404,
    };
  }

  // RLS policy rejection (edge case - should be handled by auth check first)
  if (error.code === "42501" || error.message?.includes("permission denied")) {
    return {
      code: "FORBIDDEN",
      message: "Access denied",
      status: 403,
    };
  }

  // Generic database error - log details but return generic message
  console.error("Unexpected database error:", error);
  return {
    code: "INTERNAL_ERROR" as ErrorCode,
    message: "An unexpected error occurred",
    status: 500,
  };
}
