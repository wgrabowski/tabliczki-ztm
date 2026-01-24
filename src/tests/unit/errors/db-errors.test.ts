import { describe, it, expect } from "vitest";
import { mapDatabaseError } from "@/lib/errors/db-errors";

describe("Database Error Mapping", () => {
  describe("mapDatabaseError", () => {
    it("should map 23505 to DUPLICATE_SET_NAME for sets", () => {
      const error = {
        code: "23505",
        constraint: "sets_user_id_btrim_name_uniq",
        message: "duplicate key value violates unique constraint",
        details: "Key (user_id, name)=(xxx, Test) already exists.",
      };
      const result = mapDatabaseError(error);
      expect(result.code).toBe("DUPLICATE_SET_NAME");
      expect(result.status).toBe(409);
    });

    it("should map 23505 to SET_ITEM_ALREADY_EXISTS for set_items", () => {
      const error = {
        code: "23505",
        constraint: "set_items_set_id_stop_id_uniq",
        message: "duplicate key value violates unique constraint",
        details: "Key (set_id, stop_id)=(xxx, 117) already exists.",
      };
      const result = mapDatabaseError(error);
      expect(result.code).toBe("SET_ITEM_ALREADY_EXISTS");
      expect(result.status).toBe(409);
    });

    it("should map P0001 with MAX_SETS message correctly", () => {
      const error = {
        code: "P0001",
        message: "MAX_SETS_PER_USER_EXCEEDED",
        details: null,
      };
      const result = mapDatabaseError(error);
      expect(result.code).toBe("MAX_SETS_PER_USER_EXCEEDED");
      expect(result.status).toBe(400);
    });

    it("should map P0001 with MAX_ITEMS message correctly", () => {
      const error = {
        code: "P0001",
        message: "MAX_ITEMS_PER_SET_EXCEEDED",
        details: null,
      };
      const result = mapDatabaseError(error);
      expect(result.code).toBe("MAX_ITEMS_PER_SET_EXCEEDED");
      expect(result.status).toBe(400);
    });

    it("should return generic DATABASE_ERROR for unknown codes", () => {
      const error = {
        code: "99999",
        message: "Unknown error",
        details: null,
      };
      const result = mapDatabaseError(error);
      expect(result.code).toBe("DATABASE_ERROR");
      expect(result.status).toBe(500);
    });

    it("should handle errors without code property", () => {
      const error = {
        message: "Some error",
      };
      const result = mapDatabaseError(error);
      expect(result.code).toBe("DATABASE_ERROR");
      expect(result.status).toBe(500);
    });
  });
});
