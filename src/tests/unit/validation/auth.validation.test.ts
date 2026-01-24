import { describe, it, expect } from "vitest";
import { loginCommandSchema, registerCommandSchema } from "@/lib/validation/auth.validation";

describe("Auth Validation", () => {
  describe("loginCommandSchema", () => {
    it("should accept valid email and password", () => {
      const result = loginCommandSchema.safeParse({
        email: "test@example.com",
        password: "password123",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid email format", () => {
      const result = loginCommandSchema.safeParse({
        email: "not-an-email",
        password: "password123",
      });
      expect(result.success).toBe(false);
    });

    it("should reject password shorter than 6 characters", () => {
      const result = loginCommandSchema.safeParse({
        email: "test@example.com",
        password: "12345",
      });
      expect(result.success).toBe(false);
    });

    it("should reject missing email", () => {
      const result = loginCommandSchema.safeParse({
        password: "password123",
      });
      expect(result.success).toBe(false);
    });

    it("should reject missing password", () => {
      const result = loginCommandSchema.safeParse({
        email: "test@example.com",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("registerCommandSchema", () => {
    it("should accept valid registration data", () => {
      const result = registerCommandSchema.safeParse({
        email: "new@example.com",
        password: "securepass",
      });
      expect(result.success).toBe(true);
    });

    it("should apply same validation rules as loginCommandSchema", () => {
      const invalidEmail = registerCommandSchema.safeParse({
        email: "invalid",
        password: "password123",
      });
      expect(invalidEmail.success).toBe(false);

      const shortPassword = registerCommandSchema.safeParse({
        email: "test@example.com",
        password: "12345",
      });
      expect(shortPassword.success).toBe(false);
    });
  });
});
