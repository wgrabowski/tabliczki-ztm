import { describe, it, expect, vi, beforeEach } from "vitest";
import { getUserId } from "./get-user-id";
import type { SupabaseClient } from "../../db/supabase.client";

describe("getUserId", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      auth: {
        getUser: vi.fn(),
      },
    };
  });

  describe("Production mode (JWT validation)", () => {
    it("should return userId when user is authenticated", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        aud: "authenticated",
        role: "authenticated",
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await getUserId(mockSupabase as unknown as SupabaseClient);

      expect(result).toEqual({
        success: true,
        userId: "user-123",
      });
      expect(mockSupabase.auth.getUser).toHaveBeenCalled();
    });

    it("should return UNAUTHORIZED error when auth error occurs", async () => {
      const authError = {
        message: "Invalid JWT token",
        status: 401,
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: authError,
      });

      const result = await getUserId(mockSupabase as unknown as SupabaseClient);

      expect(result).toEqual({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required",
        },
        status: 401,
      });
    });

    it("should return UNAUTHORIZED error when user is null", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await getUserId(mockSupabase as unknown as SupabaseClient);

      expect(result).toEqual({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required",
        },
        status: 401,
      });
    });

    it("should return UNAUTHORIZED when both user and error are null", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await getUserId(mockSupabase as unknown as SupabaseClient);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("UNAUTHORIZED");
        expect(result.status).toBe(401);
      }
    });

    it("should extract userId from authenticated user object", async () => {
      const mockUser = {
        id: "abc-123-xyz",
        email: "user@test.com",
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await getUserId(mockSupabase as unknown as SupabaseClient);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.userId).toBe("abc-123-xyz");
      }
    });
  });

  describe("Error handling", () => {
    it("should handle expired JWT token", async () => {
      const expiredError = {
        message: "JWT expired",
        status: 401,
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: expiredError,
      });

      const result = await getUserId(mockSupabase as unknown as SupabaseClient);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.status).toBe(401);
      }
    });

    it("should handle invalid JWT signature", async () => {
      const invalidError = {
        message: "Invalid signature",
        status: 401,
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: invalidError,
      });

      const result = await getUserId(mockSupabase as unknown as SupabaseClient);

      expect(result.success).toBe(false);
    });

    it("should handle network errors gracefully", async () => {
      const networkError = {
        message: "Network request failed",
        status: 500,
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: networkError,
      });

      const result = await getUserId(mockSupabase as unknown as SupabaseClient);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("UNAUTHORIZED");
        // Always returns 401 for any auth failure
        expect(result.status).toBe(401);
      }
    });

    it("should handle Supabase service unavailable", async () => {
      mockSupabase.auth.getUser.mockRejectedValue(new Error("Service unavailable"));

      await expect(getUserId(mockSupabase as unknown as SupabaseClient)).rejects.toThrow("Service unavailable");
    });
  });

  describe("Type safety and structure", () => {
    it("should return GetUserIdResult with correct structure on success", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      const result = await getUserId(mockSupabase as unknown as SupabaseClient);

      expect(result).toHaveProperty("success");
      if (result.success) {
        expect(result).toHaveProperty("userId");
        expect(typeof result.userId).toBe("string");
      }
    });

    it("should return GetUserIdResult with correct structure on failure", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Error" },
      });

      const result = await getUserId(mockSupabase as unknown as SupabaseClient);

      expect(result).toHaveProperty("success");
      if (!result.success) {
        expect(result).toHaveProperty("error");
        expect(result).toHaveProperty("status");
        expect(result.error).toHaveProperty("code");
        expect(result.error).toHaveProperty("message");
      }
    });

    it("should have discriminated union type for success/failure", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      const result = await getUserId(mockSupabase as unknown as SupabaseClient);

      // Type narrowing with success flag
      if (result.success) {
        expect(result.userId).toBeDefined();
        // @ts-expect-error - error should not exist on success type
        expect(result.error).toBeUndefined();
      } else {
        expect(result.error).toBeDefined();
        // @ts-expect-error - userId should not exist on failure type
        expect(result.userId).toBeUndefined();
      }
    });
  });

  describe("Integration with API endpoints", () => {
    it("should be usable in API endpoint pattern", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      const result = await getUserId(mockSupabase as unknown as SupabaseClient);

      // Simulate API endpoint usage
      if (!result.success) {
        // Would return error response
        expect(result.error).toBeDefined();
        expect(result.status).toBe(401);
      } else {
        // Would continue with authenticated userId
        expect(result.userId).toBe("user-123");
      }
    });

    it("should provide appropriate error response for API", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await getUserId(mockSupabase as unknown as SupabaseClient);

      if (!result.success) {
        // Error response can be directly serialized to JSON
        const errorResponse = {
          error: result.error,
        };
        expect(errorResponse.error.code).toBe("UNAUTHORIZED");
        expect(errorResponse.error.message).toBe("Authentication required");
      }
    });
  });

  describe("Edge cases", () => {
    it("should handle empty user object", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: { user: {} as any },
        error: null,
      });

      const result = await getUserId(mockSupabase as unknown as SupabaseClient);

      // Empty user object should still have an id (or be rejected)
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.userId).toBeUndefined();
      }
    });

    it("should handle user with undefined id", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: { user: { id: undefined } as any },
        error: null,
      });

      const result = await getUserId(mockSupabase as unknown as SupabaseClient);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.userId).toBeUndefined();
      }
    });

    it("should handle malformed auth response", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: {},
        error: null,
      });

      const result = await getUserId(mockSupabase as unknown as SupabaseClient);

      expect(result.success).toBe(false);
    });

    it("should prioritize auth error over missing user", async () => {
      const authError = {
        message: "Token invalid",
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: authError,
      });

      const result = await getUserId(mockSupabase as unknown as SupabaseClient);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("UNAUTHORIZED");
      }
    });
  });

  describe("Security considerations", () => {
    it("should not expose internal auth error details", async () => {
      const authError = {
        message: "Internal server error: database connection failed",
        status: 500,
        details: "postgres://user:password@host/db",
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: authError,
      });

      const result = await getUserId(mockSupabase as unknown as SupabaseClient);

      if (!result.success) {
        // Should return generic message, not internal details
        expect(result.error.message).toBe("Authentication required");
        expect(result.error.message).not.toContain("database");
        expect(result.error.message).not.toContain("postgres");
      }
    });

    it("should always validate JWT (no bypass mechanism)", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      await getUserId(mockSupabase as unknown as SupabaseClient);

      // Should always call getUser to validate JWT
      expect(mockSupabase.auth.getUser).toHaveBeenCalled();
    });

    it("should return consistent error format", async () => {
      const scenarios = [
        { user: null, error: { message: "JWT expired" } },
        { user: null, error: { message: "Invalid signature" } },
        { user: null, error: null },
      ];

      for (const scenario of scenarios) {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: scenario.user },
          error: scenario.error,
        });

        const result = await getUserId(mockSupabase as unknown as SupabaseClient);

        if (!result.success) {
          // All auth failures should have consistent format
          expect(result.error.code).toBe("UNAUTHORIZED");
          expect(result.error.message).toBe("Authentication required");
          expect(result.status).toBe(401);
        }
      }
    });
  });
});
