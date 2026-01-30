import { describe, it, expect } from "vitest";
import {
  createSetCommandSchema,
  updateSetCommandSchema,
  getSetsQuerySchema,
  deleteSetParamsSchema,
  createSetItemCommandSchema,
} from "./sets.validation";
import { ZodError } from "zod";

describe("Sets Validation", () => {
  describe("createSetCommandSchema", () => {
    it("should accept valid set names (1-20 chars after trim)", () => {
      const validNames = [
        { name: "A" },
        { name: "Test" },
        { name: "My Set Name" },
        { name: "1234567890" },
        { name: "12345678901234567890" }, // exactly 20 chars
        { name: "Set-123" },
        { name: "Łódź Centrum" }, // Polish characters
      ];

      validNames.forEach(({ name }) => {
        const result = createSetCommandSchema.safeParse({ name });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.name.length).toBeGreaterThanOrEqual(1);
          expect(result.data.name.length).toBeLessThanOrEqual(20);
        }
      });
    });

    it("should trim whitespace from set names", () => {
      const testCases = [
        { input: "  Test  ", expected: "Test" },
        { input: "\n\tSpaces\t\n", expected: "Spaces" },
        { input: "   A   ", expected: "A" },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = createSetCommandSchema.safeParse({ name: input });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.name).toBe(expected);
        }
      });
    });

    it("should reject empty or whitespace-only names", () => {
      const invalidNames = [
        { name: "", expectedMessage: "Set name must be at least 1 character" },
        { name: "   ", expectedMessage: "Set name must be at least 1 character" },
        { name: "\n\t", expectedMessage: "Set name must be at least 1 character" },
      ];

      invalidNames.forEach(({ name, expectedMessage }) => {
        const result = createSetCommandSchema.safeParse({ name });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe(expectedMessage);
        }
      });
    });

    it("should reject names longer than 20 characters", () => {
      const tooLongNames = [
        { name: "123456789012345678901", length: 21 }, // 21 chars
        { name: "a".repeat(50), length: 50 },
        { name: "Very Long Set Name That Exceeds Twenty Characters", length: 51 },
      ];

      tooLongNames.forEach(({ name }) => {
        const result = createSetCommandSchema.safeParse({ name });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe("Set name must be at most 20 characters");
        }
      });
    });

    it("should reject missing name field", () => {
      const result = createSetCommandSchema.safeParse({});
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Set name is required");
      }
    });

    it("should reject non-string names", () => {
      const invalidTypes = [123, null, undefined, [], {}];

      invalidTypes.forEach((value) => {
        const result = createSetCommandSchema.safeParse({ name: value });
        expect(result.success).toBe(false);
      });
    });

    it("should throw ZodError on parse failure", () => {
      expect(() => createSetCommandSchema.parse({ name: "" })).toThrow(ZodError);
    });
  });

  describe("updateSetCommandSchema", () => {
    it("should accept valid set names for update", () => {
      const validNames = [{ name: "Updated Name" }, { name: "A" }, { name: "12345678901234567890" }];

      validNames.forEach(({ name }) => {
        const result = updateSetCommandSchema.safeParse({ name });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.name).toBe(name);
        }
      });
    });

    it("should enforce same validation rules as create", () => {
      // Too long
      let result = updateSetCommandSchema.safeParse({ name: "a".repeat(21) });
      expect(result.success).toBe(false);

      // Empty after trim
      result = updateSetCommandSchema.safeParse({ name: "   " });
      expect(result.success).toBe(false);

      // Missing field
      result = updateSetCommandSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("should trim whitespace like create schema", () => {
      const result = updateSetCommandSchema.safeParse({ name: "  Updated  " });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Updated");
      }
    });
  });

  describe("getSetsQuerySchema", () => {
    it("should accept include_items as boolean", () => {
      const result1 = getSetsQuerySchema.safeParse({ include_items: true });
      expect(result1.success).toBe(true);
      if (result1.success) {
        expect(result1.data.include_items).toBe(true);
      }

      const result2 = getSetsQuerySchema.safeParse({ include_items: false });
      expect(result2.success).toBe(true);
      if (result2.success) {
        expect(result2.data.include_items).toBe(false);
      }
    });

    it("should coerce string to boolean", () => {
      // Note: z.coerce.boolean() uses JavaScript's Boolean() constructor
      // All non-empty strings are truthy and become true
      const testCases = [
        { input: "true", expected: true },
        { input: "false", expected: true }, // non-empty string is truthy
        { input: "1", expected: true },
        { input: "0", expected: true }, // non-empty string is truthy
      ];

      testCases.forEach(({ input, expected }) => {
        const result = getSetsQuerySchema.safeParse({ include_items: input });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.include_items).toBe(expected);
        }
      });
    });

    it("should default to false when include_items is not provided", () => {
      const result = getSetsQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.include_items).toBe(false);
      }
    });

    it("should accept empty query params", () => {
      const result = getSetsQuerySchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe("deleteSetParamsSchema", () => {
    it("should accept valid UUID formats", () => {
      const validUUIDs = [
        "550e8400-e29b-41d4-a716-446655440000",
        "123e4567-e89b-12d3-a456-426614174000",
        "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        "00000000-0000-0000-0000-000000000000", // nil UUID
      ];

      validUUIDs.forEach((uuid) => {
        const result = deleteSetParamsSchema.safeParse({ setId: uuid });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.setId).toBe(uuid);
        }
      });
    });

    it("should reject invalid UUID formats", () => {
      const invalidUUIDs = [
        { value: "not-a-uuid", expectedMessage: "Invalid set ID format" },
        { value: "123", expectedMessage: "Invalid set ID format" },
        { value: "123e4567-e89b-12d3-a456", expectedMessage: "Invalid set ID format" }, // too short
        { value: "123e4567-e89b-12d3-a456-426614174000-extra", expectedMessage: "Invalid set ID format" }, // too long
        { value: "", expectedMessage: "Invalid set ID format" },
        { value: "abc-def-ghi-jkl-mno", expectedMessage: "Invalid set ID format" },
      ];

      invalidUUIDs.forEach(({ value, expectedMessage }) => {
        const result = deleteSetParamsSchema.safeParse({ setId: value });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe(expectedMessage);
        }
      });
    });

    it("should reject missing setId field", () => {
      const result = deleteSetParamsSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("should reject non-string setId", () => {
      const result = deleteSetParamsSchema.safeParse({ setId: 123 });
      expect(result.success).toBe(false);
    });

    it("should be case-sensitive (lowercase UUIDs)", () => {
      const uppercaseUUID = "550E8400-E29B-41D4-A716-446655440000";
      const result = deleteSetParamsSchema.safeParse({ setId: uppercaseUUID });
      // UUID validation typically accepts both cases
      expect(result.success).toBe(true);
    });
  });

  describe("createSetItemCommandSchema", () => {
    it("should accept positive integer stop IDs", () => {
      const validStopIds = [1, 42, 117, 199, 9999, 100000];

      validStopIds.forEach((stopId) => {
        const result = createSetItemCommandSchema.safeParse({ stop_id: stopId });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.stop_id).toBe(stopId);
          expect(Number.isInteger(result.data.stop_id)).toBe(true);
        }
      });
    });

    it("should reject zero", () => {
      const result = createSetItemCommandSchema.safeParse({ stop_id: 0 });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Stop ID must be a positive integer");
      }
    });

    it("should reject negative numbers", () => {
      const negativeIds = [-1, -42, -9999];

      negativeIds.forEach((stopId) => {
        const result = createSetItemCommandSchema.safeParse({ stop_id: stopId });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe("Stop ID must be a positive integer");
        }
      });
    });

    it("should reject floating point numbers", () => {
      const floats = [1.5, 3.14, 117.99, 0.1];

      floats.forEach((stopId) => {
        const result = createSetItemCommandSchema.safeParse({ stop_id: stopId });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe("Stop ID must be an integer");
        }
      });
    });

    it("should reject missing stop_id field", () => {
      const result = createSetItemCommandSchema.safeParse({});
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Stop ID is required");
      }
    });

    it("should reject non-numeric values", () => {
      const invalidValues = ["123", "117", "abc", null, undefined, [], {}];

      invalidValues.forEach((value) => {
        const result = createSetItemCommandSchema.safeParse({ stop_id: value });
        expect(result.success).toBe(false);
      });
    });

    it("should reject NaN and Infinity", () => {
      expect(createSetItemCommandSchema.safeParse({ stop_id: NaN }).success).toBe(false);
      expect(createSetItemCommandSchema.safeParse({ stop_id: Infinity }).success).toBe(false);
      expect(createSetItemCommandSchema.safeParse({ stop_id: -Infinity }).success).toBe(false);
    });

    it("should throw ZodError on parse failure", () => {
      expect(() => createSetItemCommandSchema.parse({ stop_id: -1 })).toThrow(ZodError);
    });
  });

  describe("Edge cases and integration", () => {
    it("should handle Unicode characters in set names", () => {
      const unicodeNames = ["Zestaw 🚌", "Łódź-Gdańsk", "北京站", "Москва"];

      unicodeNames.forEach((name) => {
        const result = createSetCommandSchema.safeParse({ name });
        if (name.length <= 20) {
          expect(result.success).toBe(true);
        }
      });
    });

    it("should handle special characters in set names", () => {
      const specialChars = ["Set-123", "Set_456", "Set (Test)", "Set/Test", "Set@Home", "Test & Test"];

      specialChars.forEach((name) => {
        const result = createSetCommandSchema.safeParse({ name });
        if (name.length <= 20) {
          expect(result.success).toBe(true);
        }
      });
    });

    it("should strip unknown fields from schemas", () => {
      const result = createSetCommandSchema.safeParse({
        name: "Valid Name",
        unknownField: "should be stripped",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect("unknownField" in result.data).toBe(false);
      }
    });

    it("should handle boundary values for stop_id", () => {
      // Minimum valid
      let result = createSetItemCommandSchema.safeParse({ stop_id: 1 });
      expect(result.success).toBe(true);

      // Maximum safe integer
      result = createSetItemCommandSchema.safeParse({ stop_id: Number.MAX_SAFE_INTEGER });
      expect(result.success).toBe(true);

      // Just below minimum
      result = createSetItemCommandSchema.safeParse({ stop_id: 0 });
      expect(result.success).toBe(false);
    });

    it("should validate set name length correctly with emoji", () => {
      // Emoji characters are counted by .length which counts UTF-16 code units
      // '🚌' is a surrogate pair, so it counts as 2 characters in JS
      const nameWithEmoji = "🚌".repeat(20); // 20 emojis = 40 length units
      const result = createSetCommandSchema.safeParse({ name: nameWithEmoji });
      // This exceeds 20 character limit because emoji counts as 2 units
      expect(result.success).toBe(false);

      // Test with fewer emojis that fit within limit
      const validEmojiName = "🚌".repeat(10); // 10 emojis = 20 length units (exactly at limit)
      const validResult = createSetCommandSchema.safeParse({ name: validEmojiName });
      expect(validResult.success).toBe(true);
    });
  });
});
