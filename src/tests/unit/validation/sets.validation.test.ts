import { describe, it, expect } from "vitest";
import {
  createSetCommandSchema,
  updateSetCommandSchema,
  deleteSetParamsSchema,
} from "@/lib/validation/sets.validation";

describe("Sets Validation", () => {
  describe("createSetCommandSchema", () => {
    it("should accept valid set name (1-10 characters)", () => {
      const result = createSetCommandSchema.safeParse({ name: "Do pracy" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Do pracy");
      }
    });

    it("should trim whitespace from set name", () => {
      const result = createSetCommandSchema.safeParse({ name: "  Test  " });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Test");
      }
    });

    it("should reject empty set name", () => {
      const result = createSetCommandSchema.safeParse({ name: "" });
      expect(result.success).toBe(false);
    });

    it("should reject set name with only whitespace", () => {
      const result = createSetCommandSchema.safeParse({ name: "   " });
      expect(result.success).toBe(false);
    });

    it("should reject set name longer than 10 characters", () => {
      const result = createSetCommandSchema.safeParse({
        name: "12345678901",
      });
      expect(result.success).toBe(false);
    });

    it("should reject missing name field", () => {
      const result = createSetCommandSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe("updateSetCommandSchema", () => {
    it("should accept valid update payload", () => {
      const result = updateSetCommandSchema.safeParse({ name: "Updated" });
      expect(result.success).toBe(true);
    });

    it("should apply same validation rules as createSetCommandSchema", () => {
      const tooLong = updateSetCommandSchema.safeParse({
        name: "12345678901",
      });
      expect(tooLong.success).toBe(false);

      const empty = updateSetCommandSchema.safeParse({ name: "" });
      expect(empty.success).toBe(false);
    });
  });

  describe("deleteSetParamsSchema", () => {
    it("should accept valid UUID", () => {
      const validUuid = "550e8400-e29b-41d4-a716-446655440000";
      const result = deleteSetParamsSchema.safeParse({ setId: validUuid });
      expect(result.success).toBe(true);
    });

    it("should reject invalid UUID", () => {
      const result = deleteSetParamsSchema.safeParse({ setId: "not-a-uuid" });
      expect(result.success).toBe(false);
    });

    it("should reject missing setId", () => {
      const result = deleteSetParamsSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });
});
