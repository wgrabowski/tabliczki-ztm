import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/pages/api/sets/index";
import { createMockAPIContext } from "@/tests/helpers/mocks";
import { createTestSet } from "@/tests/fixtures/data";

describe("Sets API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/sets", () => {
    it("should return 401 for unauthenticated requests", async () => {
      const context = createMockAPIContext();

      // Mock unauthenticated session
      context.locals.supabase.auth.getUser = vi.fn().mockResolvedValue({ data: { user: null }, error: null });

      const response = await GET(context);
      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.code).toBe("UNAUTHORIZED");
    });

    it("should return user sets for authenticated requests", async () => {
      const mockSets = [createTestSet({ id: "set-1", name: "Set 1" }), createTestSet({ id: "set-2", name: "Set 2" })];

      const context = createMockAPIContext();

      // Mock authenticated session
      context.locals.supabase.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      // Mock database query
      const mockSelect = vi.fn().mockResolvedValue({
        data: mockSets,
        error: null,
      });

      context.locals.supabase.from = vi.fn(() => ({
        select: mockSelect,
      }));

      const response = await GET(context);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.sets).toHaveLength(2);
      expect(data.total_count).toBe(2);
    });
  });

  describe("POST /api/sets", () => {
    it("should return 400 for invalid set name", async () => {
      const context = createMockAPIContext({
        request: new Request("http://localhost:4321/api/sets", {
          method: "POST",
          body: JSON.stringify({ name: "" }),
          headers: { "Content-Type": "application/json" },
        }),
      });

      context.locals.supabase.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      const response = await POST(context);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.code).toBe("INVALID_SET_NAME");
    });

    it("should return 400 for set name longer than 20 characters", async () => {
      const context = createMockAPIContext({
        request: new Request("http://localhost:4321/api/sets", {
          method: "POST",
          body: JSON.stringify({ name: "123456789012345678901" }),
          headers: { "Content-Type": "application/json" },
        }),
      });

      context.locals.supabase.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      const response = await POST(context);
      expect(response.status).toBe(400);
    });

    it("should create a set with valid data", async () => {
      const newSet = createTestSet({ name: "New Set" });

      const context = createMockAPIContext({
        request: new Request("http://localhost:4321/api/sets", {
          method: "POST",
          body: JSON.stringify({ name: "New Set" }),
          headers: { "Content-Type": "application/json" },
        }),
      });

      context.locals.supabase.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      // Mock insert
      const mockInsert = vi.fn().mockResolvedValue({
        data: newSet,
        error: null,
      });

      context.locals.supabase.from = vi.fn(() => ({
        insert: mockInsert,
        select: vi.fn().mockResolvedValue({ data: [newSet], error: null }),
      }));

      const response = await POST(context);
      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.created_set).toBeDefined();
      expect(data.created_set.name).toBe("New Set");
    });
  });
});
