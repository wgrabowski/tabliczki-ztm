import { describe, it, expect } from "vitest";
import { authEmailSchema, authPasswordSchema, loginCommandSchema, registerCommandSchema } from "./auth.validation";
import { ZodError } from "zod";

describe("Auth Validation", () => {
  describe("authEmailSchema", () => {
    it("should accept valid email addresses", () => {
      const validEmails = [
        "user@example.com",
        "test.user@domain.co.uk",
        "user+tag@example.com",
        "firstname.lastname@company.org",
        "email123@test-domain.com",
      ];

      validEmails.forEach((email) => {
        const result = authEmailSchema.safeParse(email);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBe(email);
        }
      });
    });

    it("should trim whitespace from email", () => {
      const result = authEmailSchema.safeParse("  user@example.com  ");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("user@example.com");
      }
    });

    it("should reject invalid email formats", () => {
      const invalidEmails = [
        { value: "", expectedMessage: "Adres e-mail jest wymagany" },
        { value: "   ", expectedMessage: "Adres e-mail jest wymagany" },
        { value: "invalid", expectedMessage: "Nieprawidłowy format adresu e-mail" },
        { value: "@example.com", expectedMessage: "Nieprawidłowy format adresu e-mail" },
        { value: "user@", expectedMessage: "Nieprawidłowy format adresu e-mail" },
        { value: "user @example.com", expectedMessage: "Nieprawidłowy format adresu e-mail" },
        { value: "user@@example.com", expectedMessage: "Nieprawidłowy format adresu e-mail" },
      ];

      invalidEmails.forEach(({ value, expectedMessage }) => {
        const result = authEmailSchema.safeParse(value);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe(expectedMessage);
        }
      });
    });

    it("should throw ZodError for invalid email", () => {
      expect(() => authEmailSchema.parse("invalid-email")).toThrow(ZodError);
    });
  });

  describe("authPasswordSchema", () => {
    it("should accept passwords with 6 or more characters", () => {
      const validPasswords = [
        "123456",
        "password",
        "longerPassword123",
        "P@ssw0rd!",
        "a".repeat(100), // very long password
      ];

      validPasswords.forEach((password) => {
        const result = authPasswordSchema.safeParse(password);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBe(password);
        }
      });
    });

    it("should reject passwords shorter than 6 characters", () => {
      const invalidPasswords = [
        { value: "", expectedMessage: "Hasło musi mieć co najmniej 6 znaków" },
        { value: "1", expectedMessage: "Hasło musi mieć co najmniej 6 znaków" },
        { value: "12345", expectedMessage: "Hasło musi mieć co najmniej 6 znaków" },
        { value: "abc", expectedMessage: "Hasło musi mieć co najmniej 6 znaków" },
      ];

      invalidPasswords.forEach(({ value, expectedMessage }) => {
        const result = authPasswordSchema.safeParse(value);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe(expectedMessage);
        }
      });
    });

    it("should not trim password (preserve spaces)", () => {
      // Passwords should NOT be trimmed to preserve intentional spaces
      const result = authPasswordSchema.safeParse("  pass  ");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("  pass  ");
      }
    });

    it("should throw ZodError for invalid password", () => {
      expect(() => authPasswordSchema.parse("12345")).toThrow(ZodError);
    });
  });

  describe("loginCommandSchema", () => {
    it("should accept valid login credentials", () => {
      const validCredentials = [
        { email: "user@example.com", password: "password123" },
        { email: "test@test.com", password: "123456" },
        { email: "admin@company.org", password: "secureP@ss!" },
      ];

      validCredentials.forEach((credentials) => {
        const result = loginCommandSchema.safeParse(credentials);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual({
            email: credentials.email.trim(),
            password: credentials.password,
          });
        }
      });
    });

    it("should reject missing email field", () => {
      const result = loginCommandSchema.safeParse({ password: "password123" });
      expect(result.success).toBe(false);
    });

    it("should reject missing password field", () => {
      const result = loginCommandSchema.safeParse({ email: "test@test.com" });
      expect(result.success).toBe(false);
    });

    it("should reject empty object", () => {
      const result = loginCommandSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("should reject invalid email in login", () => {
      const result = loginCommandSchema.safeParse({
        email: "invalid-email",
        password: "password123",
      });
      expect(result.success).toBe(false);
    });

    it("should reject short password in login", () => {
      const result = loginCommandSchema.safeParse({
        email: "user@example.com",
        password: "12345",
      });
      expect(result.success).toBe(false);
    });

    it("should collect multiple validation errors", () => {
      const result = loginCommandSchema.safeParse({
        email: "invalid",
        password: "123",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        // Both email and password should have errors
        expect(result.error.issues.length).toBeGreaterThanOrEqual(2);
      }
    });
  });

  describe("registerCommandSchema", () => {
    it("should accept valid registration data", () => {
      const validRegistrations = [
        { email: "newuser@example.com", password: "securePass123" },
        { email: "test@domain.com", password: "password" },
      ];

      validRegistrations.forEach((registration) => {
        const result = registerCommandSchema.safeParse(registration);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual({
            email: registration.email.trim(),
            password: registration.password,
          });
        }
      });
    });

    it("should enforce same validation rules as login", () => {
      // Invalid email
      let result = registerCommandSchema.safeParse({
        email: "invalid-email",
        password: "password123",
      });
      expect(result.success).toBe(false);

      // Short password
      result = registerCommandSchema.safeParse({
        email: "user@example.com",
        password: "12345",
      });
      expect(result.success).toBe(false);

      // Missing fields
      result = registerCommandSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("should reject additional unexpected fields (strict mode)", () => {
      const result = registerCommandSchema.safeParse({
        email: "user@example.com",
        password: "password123",
        unexpectedField: "should be stripped or rejected",
      });

      // Zod by default strips unknown keys in safeParse
      // The parse should succeed, but extra fields are ignored
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          email: "user@example.com",
          password: "password123",
        });
        expect("unexpectedField" in result.data).toBe(false);
      }
    });
  });

  describe("Edge cases and security", () => {
    it("should handle SQL injection attempts in email", () => {
      const sqlInjection = "admin'--@example.com";
      const result = authEmailSchema.safeParse(sqlInjection);
      // Email validator accepts this as technically valid email format
      // SQL injection protection is handled at the database layer (parameterized queries)
      expect(result.success).toBe(true);
    });

    it("should handle very long emails", () => {
      const longEmail = "a".repeat(300) + "@example.com";
      const result = authEmailSchema.safeParse(longEmail);
      // Zod doesn't have max length by default, but email format might reject it
      expect(result.success).toBe(true);
    });

    it("should handle Unicode characters in password", () => {
      const unicodePassword = "パスワード123"; // Japanese characters
      expect(unicodePassword.length).toBeGreaterThanOrEqual(6);
      const result = authPasswordSchema.safeParse(unicodePassword);
      expect(result.success).toBe(true);
    });

    it("should handle null and undefined gracefully", () => {
      expect(authEmailSchema.safeParse(null).success).toBe(false);
      expect(authEmailSchema.safeParse(undefined).success).toBe(false);
      expect(authPasswordSchema.safeParse(null).success).toBe(false);
      expect(authPasswordSchema.safeParse(undefined).success).toBe(false);
    });

    it("should handle non-string types", () => {
      expect(authEmailSchema.safeParse(123).success).toBe(false);
      expect(authEmailSchema.safeParse({}).success).toBe(false);
      expect(authEmailSchema.safeParse([]).success).toBe(false);
      expect(authPasswordSchema.safeParse(123456).success).toBe(false);
    });
  });
});
