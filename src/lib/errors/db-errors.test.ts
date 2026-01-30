import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mapDatabaseError } from "./db-errors";

describe("Database Error Mapping", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe("SET_NOT_FOUND errors", () => {
    it("should map explicit SET_NOT_FOUND code", () => {
      const error = { code: "SET_NOT_FOUND" };
      const result = mapDatabaseError(error);

      expect(result).toEqual({
        code: "SET_NOT_FOUND",
        message: "Set not found or access denied",
        status: 404,
      });
    });

    it("should map SET_NOT_FOUND message", () => {
      const error = { message: "SET_NOT_FOUND" };
      const result = mapDatabaseError(error);

      expect(result).toEqual({
        code: "SET_NOT_FOUND",
        message: "Set not found or access denied",
        status: 404,
      });
    });

    it("should map PostgREST PGRST116 error", () => {
      const error = {
        code: "PGRST116",
        message: "The result contains 0 rows",
      };
      const result = mapDatabaseError(error);

      expect(result).toEqual({
        code: "SET_NOT_FOUND",
        message: "Set not found or access denied",
        status: 404,
      });
    });
  });

  describe("DUPLICATE_SET_NAME errors", () => {
    it("should map 23505 with btrim_name_uniq constraint", () => {
      const error = {
        code: "23505",
        constraint: "sets_user_id_btrim_name_uniq",
        message: "duplicate key value violates unique constraint",
      };
      const result = mapDatabaseError(error);

      expect(result).toEqual({
        code: "DUPLICATE_SET_NAME",
        message: "A set with this name already exists",
        status: 409,
      });
    });

    it("should map 23505 with constraint in message", () => {
      const error = {
        code: "23505",
        message: 'duplicate key value violates unique constraint "sets_user_id_btrim_name_uniq"',
      };
      const result = mapDatabaseError(error);

      expect(result).toEqual({
        code: "DUPLICATE_SET_NAME",
        message: "A set with this name already exists",
        status: 409,
      });
    });

    it("should map 23505 with partial constraint name match", () => {
      const error = {
        code: "23505",
        constraint: "btrim_name_uniq_index",
      };
      const result = mapDatabaseError(error);

      expect(result).toEqual({
        code: "DUPLICATE_SET_NAME",
        message: "A set with this name already exists",
        status: 409,
      });
    });
  });

  describe("MAX_SETS_PER_USER_EXCEEDED errors", () => {
    it("should map trigger exception for max sets", () => {
      const error = {
        message: "MAX_SETS_PER_USER_EXCEEDED: User cannot have more than 6 sets",
      };
      const result = mapDatabaseError(error);

      expect(result).toEqual({
        code: "MAX_SETS_PER_USER_EXCEEDED",
        message: "Maximum number of sets (6) reached for this user",
        status: 400,
      });
    });

    it("should detect MAX_SETS_PER_USER_EXCEEDED in message", () => {
      const error = {
        code: "P0001",
        message: "Error: MAX_SETS_PER_USER_EXCEEDED",
      };
      const result = mapDatabaseError(error);

      expect(result.code).toBe("MAX_SETS_PER_USER_EXCEEDED");
      expect(result.status).toBe(400);
    });
  });

  describe("SET_ITEM_ALREADY_EXISTS errors", () => {
    it("should map 23505 with set_items unique constraint", () => {
      const error = {
        code: "23505",
        constraint: "set_items_set_id_stop_id_uniq",
        message: "duplicate key value violates unique constraint",
      };
      const result = mapDatabaseError(error);

      expect(result).toEqual({
        code: "SET_ITEM_ALREADY_EXISTS",
        message: "This stop is already added to the set",
        status: 409,
      });
    });

    it("should map 23505 with constraint in message", () => {
      const error = {
        code: "23505",
        message: 'duplicate key value violates unique constraint "set_items_set_id_stop_id_uniq"',
      };
      const result = mapDatabaseError(error);

      expect(result).toEqual({
        code: "SET_ITEM_ALREADY_EXISTS",
        message: "This stop is already added to the set",
        status: 409,
      });
    });
  });

  describe("MAX_ITEMS_PER_SET_EXCEEDED errors", () => {
    it("should map trigger exception for max items", () => {
      const error = {
        message: "MAX_ITEMS_PER_SET_EXCEEDED: Set cannot have more than 6 items",
      };
      const result = mapDatabaseError(error);

      expect(result).toEqual({
        code: "MAX_ITEMS_PER_SET_EXCEEDED",
        message: "Maximum number of items (6) reached for this set",
        status: 400,
      });
    });

    it("should detect MAX_ITEMS_PER_SET_EXCEEDED in message", () => {
      const error = {
        code: "P0001",
        message: "Error in trigger: MAX_ITEMS_PER_SET_EXCEEDED",
      };
      const result = mapDatabaseError(error);

      expect(result.code).toBe("MAX_ITEMS_PER_SET_EXCEEDED");
      expect(result.status).toBe(400);
    });
  });

  describe("ITEM_NOT_FOUND errors", () => {
    it("should map explicit ITEM_NOT_FOUND code", () => {
      const error = { code: "ITEM_NOT_FOUND" };
      const result = mapDatabaseError(error);

      expect(result).toEqual({
        code: "ITEM_NOT_FOUND",
        message: "Item not found or access denied",
        status: 404,
      });
    });

    it("should map ITEM_NOT_FOUND message", () => {
      const error = { message: "ITEM_NOT_FOUND" };
      const result = mapDatabaseError(error);

      expect(result).toEqual({
        code: "ITEM_NOT_FOUND",
        message: "Item not found or access denied",
        status: 404,
      });
    });
  });

  describe("FORBIDDEN errors (RLS)", () => {
    it("should map PostgreSQL permission denied code 42501", () => {
      const error = {
        code: "42501",
        message: "permission denied for table sets",
      };
      const result = mapDatabaseError(error);

      expect(result).toEqual({
        code: "FORBIDDEN",
        message: "Access denied",
        status: 403,
      });
    });

    it("should map permission denied in message", () => {
      const error = {
        message: "permission denied: RLS policy violation",
      };
      const result = mapDatabaseError(error);

      expect(result).toEqual({
        code: "FORBIDDEN",
        message: "Access denied",
        status: 403,
      });
    });

    it("should handle mixed case permission denied", () => {
      const error = {
        message: "Permission Denied for operation",
      };
      const result = mapDatabaseError(error);

      // Implementation is case-sensitive, "Permission Denied" (capital P, capital D) doesn't match
      // Only lowercase "permission denied" matches
      expect(result).toEqual({
        code: "DATABASE_ERROR",
        message: "An unexpected error occurred",
        status: 500,
      });
    });
  });

  describe("Generic DATABASE_ERROR fallback", () => {
    it("should map unknown error codes to DATABASE_ERROR", () => {
      const error = {
        code: "UNKNOWN_CODE",
        message: "Something went wrong",
      };
      const result = mapDatabaseError(error);

      expect(result).toEqual({
        code: "DATABASE_ERROR",
        message: "An unexpected error occurred",
        status: 500,
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith("Unexpected database error:", error);
    });

    it("should handle errors without code", () => {
      const error = {
        message: "Generic database failure",
      };
      const result = mapDatabaseError(error);

      expect(result.code).toBe("DATABASE_ERROR");
      expect(result.status).toBe(500);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it("should handle completely unknown error structures", () => {
      const error = { unknownField: "value" };
      const result = mapDatabaseError(error);

      expect(result).toEqual({
        code: "DATABASE_ERROR",
        message: "An unexpected error occurred",
        status: 500,
      });
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it("should handle null error", () => {
      // Note: Current implementation doesn't handle null safely - would throw
      // This test documents that behavior. In production, null should be caught earlier.
      expect(() => mapDatabaseError(null)).toThrow();
    });

    it("should handle undefined error", () => {
      // Note: Current implementation doesn't handle undefined safely - would throw
      // This test documents that behavior. In production, undefined should be caught earlier.
      expect(() => mapDatabaseError(undefined)).toThrow();
    });

    it("should handle string error", () => {
      const result = mapDatabaseError("Something went wrong");

      expect(result.code).toBe("DATABASE_ERROR");
      expect(result.status).toBe(500);
    });

    it("should handle Error instance", () => {
      const error = new Error("Database connection failed");
      const result = mapDatabaseError(error);

      expect(result.code).toBe("DATABASE_ERROR");
      expect(result.status).toBe(500);
    });
  });

  describe("Edge cases and priority", () => {
    it("should prioritize SET_NOT_FOUND over other codes", () => {
      const error = {
        code: "SET_NOT_FOUND",
        constraint: "some_other_constraint",
        message: "SET_NOT_FOUND",
      };
      const result = mapDatabaseError(error);

      expect(result.code).toBe("SET_NOT_FOUND");
    });

    it("should differentiate between duplicate set name and duplicate item", () => {
      const setDuplicate = {
        code: "23505",
        constraint: "sets_user_id_btrim_name_uniq",
      };
      const itemDuplicate = {
        code: "23505",
        constraint: "set_items_set_id_stop_id_uniq",
      };

      expect(mapDatabaseError(setDuplicate).code).toBe("DUPLICATE_SET_NAME");
      expect(mapDatabaseError(itemDuplicate).code).toBe("SET_ITEM_ALREADY_EXISTS");
    });

    it("should handle 23505 without specific constraint as generic error", () => {
      const error = {
        code: "23505",
        message: "unique constraint violation",
      };
      const result = mapDatabaseError(error);

      // Without specific constraint match, falls through to generic
      expect(result.code).toBe("DATABASE_ERROR");
      expect(result.status).toBe(500);
    });

    it("should match permission denied in lowercase", () => {
      const error = {
        message: "permission denied for table",
      };
      const result = mapDatabaseError(error);

      // Implementation is case-sensitive and matches lowercase "permission denied"
      expect(result.code).toBe("FORBIDDEN");
    });

    it("should handle complex error objects with nested properties", () => {
      const complexError = {
        code: "23505",
        constraint: "sets_user_id_btrim_name_uniq",
        message: "duplicate key value",
        details: "Key (user_id, name)=(uuid, test) already exists",
        hint: "Try using a different name",
        schema: "public",
        table: "sets",
      };

      const result = mapDatabaseError(complexError);
      expect(result.code).toBe("DUPLICATE_SET_NAME");
    });
  });

  describe("Message content validation", () => {
    it("should return user-friendly messages", () => {
      const testCases = [
        { error: { code: "SET_NOT_FOUND" }, expectedMessage: "Set not found or access denied" },
        {
          error: { code: "23505", constraint: "sets_user_id_btrim_name_uniq" },
          expectedMessage: "A set with this name already exists",
        },
        {
          error: { message: "MAX_SETS_PER_USER_EXCEEDED" },
          expectedMessage: "Maximum number of sets (6) reached for this user",
        },
        {
          error: { message: "MAX_ITEMS_PER_SET_EXCEEDED" },
          expectedMessage: "Maximum number of items (6) reached for this set",
        },
        { error: { code: "42501" }, expectedMessage: "Access denied" },
      ];

      testCases.forEach(({ error, expectedMessage }) => {
        const result = mapDatabaseError(error);
        expect(result.message).toBe(expectedMessage);
      });
    });

    it("should not expose internal error details in messages", () => {
      const error = {
        code: "UNKNOWN",
        message: "Internal server error with connection pool",
        details: "Connection string: postgres://user:pass@localhost:5432/db",
      };

      const result = mapDatabaseError(error);
      expect(result.message).toBe("An unexpected error occurred");
      expect(result.message).not.toContain("connection pool");
      expect(result.message).not.toContain("postgres://");
    });
  });

  describe("HTTP status code validation", () => {
    it("should return correct HTTP status codes", () => {
      const statusTests = [
        { error: { code: "SET_NOT_FOUND" }, expectedStatus: 404 },
        { error: { code: "ITEM_NOT_FOUND" }, expectedStatus: 404 },
        { error: { code: "23505", constraint: "sets_user_id_btrim_name_uniq" }, expectedStatus: 409 },
        { error: { code: "23505", constraint: "set_items_set_id_stop_id_uniq" }, expectedStatus: 409 },
        { error: { message: "MAX_SETS_PER_USER_EXCEEDED" }, expectedStatus: 400 },
        { error: { message: "MAX_ITEMS_PER_SET_EXCEEDED" }, expectedStatus: 400 },
        { error: { code: "42501" }, expectedStatus: 403 },
        { error: { code: "UNKNOWN" }, expectedStatus: 500 },
      ];

      statusTests.forEach(({ error, expectedStatus }) => {
        const result = mapDatabaseError(error);
        expect(result.status).toBe(expectedStatus);
      });
    });
  });
});
