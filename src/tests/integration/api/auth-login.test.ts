import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/pages/api/auth/login";
import { createMockAPIContext } from "@/tests/helpers/mocks";

// This is an example integration test structure
// You'll need to adapt it based on your actual API implementation

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 400 for invalid JSON", async () => {
    const context = createMockAPIContext({
      request: new Request("http://localhost:4321/api/auth/login", {
        method: "POST",
        body: "invalid-json",
      }),
    });

    const response = await POST(context);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.code).toBe("INVALID_INPUT");
  });

  it("should return 400 for missing email", async () => {
    const context = createMockAPIContext({
      request: new Request("http://localhost:4321/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ password: "password123" }),
        headers: { "Content-Type": "application/json" },
      }),
    });

    const response = await POST(context);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.code).toBe("INVALID_INPUT");
  });

  it("should return 400 for invalid email format", async () => {
    const context = createMockAPIContext({
      request: new Request("http://localhost:4321/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "not-an-email",
          password: "password123",
        }),
        headers: { "Content-Type": "application/json" },
      }),
    });

    const response = await POST(context);
    expect(response.status).toBe(400);
  });

  it("should return 400 for password shorter than 6 characters", async () => {
    const context = createMockAPIContext({
      request: new Request("http://localhost:4321/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
          password: "12345",
        }),
        headers: { "Content-Type": "application/json" },
      }),
    });

    const response = await POST(context);
    expect(response.status).toBe(400);
  });

  it("should attempt to sign in with valid credentials", async () => {
    const mockSignIn = vi.fn().mockResolvedValue({
      data: { user: { id: "user-123", email: "test@example.com" } },
      error: null,
    });

    const context = createMockAPIContext({
      request: new Request("http://localhost:4321/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
          password: "password123",
        }),
        headers: { "Content-Type": "application/json" },
      }),
    });

    // Mock Supabase auth
    context.locals.supabase.auth.signInWithPassword = mockSignIn;

    await POST(context);

    // Verify signInWithPassword was called
    expect(mockSignIn).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "password123",
    });
  });
});
