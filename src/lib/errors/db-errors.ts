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
 * - Custom trigger messages for business logic errors (max sets)
 *
 * @param error - Error object from database operation
 * @returns Mapped error with appropriate code, message, and HTTP status
 */
export function mapDatabaseError(error: { code: string; constraint: string; message: string }): MappedError {
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
