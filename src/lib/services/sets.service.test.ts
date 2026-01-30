import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSet, updateSet, deleteSet, getAllUserSetsWithCounts } from "./sets.service";
import type { SupabaseClient } from "../../db/supabase.client";

describe("Sets Service", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockSupabase: any;

  beforeEach(() => {
    // Create a fresh mock for each test
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
    };
  });

  describe("createSet", () => {
    it("should create a new set successfully", async () => {
      const mockSet = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        name: "Test Set",
        user_id: "user-123",
      };

      mockSupabase.single.mockResolvedValue({
        data: mockSet,
        error: null,
      });

      const result = await createSet(mockSupabase as unknown as SupabaseClient, "user-123", "Test Set");

      expect(result).toEqual(mockSet);
      expect(mockSupabase.from).toHaveBeenCalledWith("sets");
      expect(mockSupabase.insert).toHaveBeenCalledWith({
        name: "Test Set",
        user_id: "user-123",
      });
      expect(mockSupabase.select).toHaveBeenCalled();
      expect(mockSupabase.single).toHaveBeenCalled();
    });

    it("should trim set name before insert", async () => {
      const mockSet = {
        id: "set-id",
        name: "Trimmed",
        user_id: "user-123",
      };

      mockSupabase.single.mockResolvedValue({
        data: mockSet,
        error: null,
      });

      await createSet(mockSupabase as unknown as SupabaseClient, "user-123", "  Trimmed  ");

      expect(mockSupabase.insert).toHaveBeenCalledWith({
        name: "Trimmed",
        user_id: "user-123",
      });
    });

    it("should throw error on duplicate set name", async () => {
      const duplicateError = {
        code: "23505",
        constraint: "sets_user_id_btrim_name_uniq",
        message: "duplicate key value violates unique constraint",
      };

      mockSupabase.single.mockResolvedValue({
        data: null,
        error: duplicateError,
      });

      await expect(createSet(mockSupabase as unknown as SupabaseClient, "user-123", "Duplicate")).rejects.toMatchObject(
        {
          code: "23505",
        }
      );
    });

    it("should throw error when max sets exceeded", async () => {
      const maxSetsError = {
        message: "MAX_SETS_PER_USER_EXCEEDED",
      };

      mockSupabase.single.mockResolvedValue({
        data: null,
        error: maxSetsError,
      });

      await expect(
        createSet(mockSupabase as unknown as SupabaseClient, "user-123", "Seventh Set")
      ).rejects.toMatchObject({
        message: "MAX_SETS_PER_USER_EXCEEDED",
      });
    });

    it("should throw error when database returns no data", async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: null,
      });

      await expect(createSet(mockSupabase as unknown as SupabaseClient, "user-123", "Test")).rejects.toThrow(
        "Failed to create set: no data returned"
      );
    });

    it("should handle general database errors", async () => {
      const dbError = {
        code: "UNKNOWN",
        message: "Connection failed",
      };

      mockSupabase.single.mockResolvedValue({
        data: null,
        error: dbError,
      });

      await expect(createSet(mockSupabase as unknown as SupabaseClient, "user-123", "Test")).rejects.toMatchObject({
        code: "UNKNOWN",
      });
    });
  });

  describe("updateSet", () => {
    it("should update set name successfully", async () => {
      const updatedSet = {
        id: "set-id",
        name: "Updated Name",
        user_id: "user-123",
      };

      mockSupabase.single.mockResolvedValue({
        data: updatedSet,
        error: null,
      });

      const result = await updateSet(mockSupabase as unknown as SupabaseClient, "user-123", "set-id", "Updated Name");

      expect(result).toEqual(updatedSet);
      expect(mockSupabase.from).toHaveBeenCalledWith("sets");
      expect(mockSupabase.update).toHaveBeenCalledWith({ name: "Updated Name" });
      expect(mockSupabase.eq).toHaveBeenCalledWith("id", "set-id");
      expect(mockSupabase.eq).toHaveBeenCalledWith("user_id", "user-123");
    });

    it("should trim set name before update", async () => {
      const updatedSet = {
        id: "set-id",
        name: "Trimmed",
        user_id: "user-123",
      };

      mockSupabase.single.mockResolvedValue({
        data: updatedSet,
        error: null,
      });

      await updateSet(mockSupabase as unknown as SupabaseClient, "user-123", "set-id", "  Trimmed  ");

      expect(mockSupabase.update).toHaveBeenCalledWith({ name: "Trimmed" });
    });

    it("should throw SET_NOT_FOUND when PGRST116 error occurs", async () => {
      const notFoundError = {
        code: "PGRST116",
        message: "The result contains 0 rows",
      };

      mockSupabase.single.mockResolvedValue({
        data: null,
        error: notFoundError,
      });

      await expect(
        updateSet(mockSupabase as unknown as SupabaseClient, "user-123", "nonexistent-id", "New Name")
      ).rejects.toMatchObject({
        code: "SET_NOT_FOUND",
        message: "SET_NOT_FOUND",
      });
    });

    it("should throw SET_NOT_FOUND when no data returned without error", async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: null,
      });

      await expect(
        updateSet(mockSupabase as unknown as SupabaseClient, "user-123", "set-id", "New Name")
      ).rejects.toMatchObject({
        code: "SET_NOT_FOUND",
        message: "SET_NOT_FOUND",
      });
    });

    it("should throw error on duplicate name during update", async () => {
      const duplicateError = {
        code: "23505",
        constraint: "sets_user_id_btrim_name_uniq",
        message: "duplicate key value",
      };

      mockSupabase.single.mockResolvedValue({
        data: null,
        error: duplicateError,
      });

      await expect(
        updateSet(mockSupabase as unknown as SupabaseClient, "user-123", "set-id", "Duplicate")
      ).rejects.toMatchObject({
        code: "23505",
      });
    });

    it("should verify ownership with user_id filter", async () => {
      const updatedSet = {
        id: "set-id",
        name: "Updated",
        user_id: "user-123",
      };

      mockSupabase.single.mockResolvedValue({
        data: updatedSet,
        error: null,
      });

      await updateSet(mockSupabase as unknown as SupabaseClient, "user-123", "set-id", "Updated");

      // Should call eq() twice: once for id, once for user_id
      expect(mockSupabase.eq).toHaveBeenCalledTimes(2);
      expect(mockSupabase.eq).toHaveBeenCalledWith("id", "set-id");
      expect(mockSupabase.eq).toHaveBeenCalledWith("user_id", "user-123");
    });
  });

  describe("deleteSet", () => {
    it("should delete set successfully", async () => {
      const deletedSet = {
        id: "set-id",
        name: "Deleted Set",
        user_id: "user-123",
      };

      mockSupabase.select.mockResolvedValue({
        data: [deletedSet],
        error: null,
      });

      await deleteSet(mockSupabase as unknown as SupabaseClient, "user-123", "set-id");

      expect(mockSupabase.from).toHaveBeenCalledWith("sets");
      expect(mockSupabase.delete).toHaveBeenCalled();
      expect(mockSupabase.eq).toHaveBeenCalledWith("id", "set-id");
      expect(mockSupabase.eq).toHaveBeenCalledWith("user_id", "user-123");
      expect(mockSupabase.select).toHaveBeenCalled();
    });

    it("should verify ownership with user_id filter", async () => {
      mockSupabase.select.mockResolvedValue({
        data: [{ id: "set-id" }],
        error: null,
      });

      await deleteSet(mockSupabase as unknown as SupabaseClient, "user-123", "set-id");

      expect(mockSupabase.eq).toHaveBeenCalledWith("user_id", "user-123");
    });

    it("should throw SET_NOT_FOUND when no rows deleted", async () => {
      mockSupabase.select.mockResolvedValue({
        data: [],
        error: null,
      });

      await expect(
        deleteSet(mockSupabase as unknown as SupabaseClient, "user-123", "nonexistent-id")
      ).rejects.toMatchObject({
        code: "SET_NOT_FOUND",
        message: "SET_NOT_FOUND",
      });
    });

    it("should throw SET_NOT_FOUND when data is null", async () => {
      mockSupabase.select.mockResolvedValue({
        data: null,
        error: null,
      });

      await expect(deleteSet(mockSupabase as unknown as SupabaseClient, "user-123", "set-id")).rejects.toMatchObject({
        code: "SET_NOT_FOUND",
      });
    });

    it("should throw database error on delete failure", async () => {
      const dbError = {
        code: "DATABASE_ERROR",
        message: "Failed to delete",
      };

      mockSupabase.select.mockResolvedValue({
        data: null,
        error: dbError,
      });

      await expect(deleteSet(mockSupabase as unknown as SupabaseClient, "user-123", "set-id")).rejects.toMatchObject({
        code: "DATABASE_ERROR",
      });
    });

    it("should handle cascade delete of set_items", async () => {
      // This is handled by DB constraints, but we can verify the delete call
      mockSupabase.select.mockResolvedValue({
        data: [{ id: "set-id" }],
        error: null,
      });

      await deleteSet(mockSupabase as unknown as SupabaseClient, "user-123", "set-id");

      // Verify delete was called on the sets table
      expect(mockSupabase.from).toHaveBeenCalledWith("sets");
      expect(mockSupabase.delete).toHaveBeenCalled();
    });
  });

  describe("getAllUserSetsWithCounts", () => {
    it("should return sets with item counts", async () => {
      const mockData = [
        {
          id: "set-1",
          name: "Set One",
          user_id: "user-123",
          set_items: [{ id: "item-1" }, { id: "item-2" }],
        },
        {
          id: "set-2",
          name: "Set Two",
          user_id: "user-123",
          set_items: [{ id: "item-3" }],
        },
      ];

      mockSupabase.order.mockResolvedValue({
        data: mockData,
        error: null,
      });

      const result = await getAllUserSetsWithCounts(mockSupabase as unknown as SupabaseClient, "user-123");

      expect(result).toEqual([
        { id: "set-1", name: "Set One", user_id: "user-123", item_count: 2 },
        { id: "set-2", name: "Set Two", user_id: "user-123", item_count: 1 },
      ]);
    });

    it("should return empty array when user has no sets", async () => {
      mockSupabase.order.mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await getAllUserSetsWithCounts(mockSupabase as unknown as SupabaseClient, "user-123");

      expect(result).toEqual([]);
    });

    it("should return empty array when data is null", async () => {
      mockSupabase.order.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await getAllUserSetsWithCounts(mockSupabase as unknown as SupabaseClient, "user-123");

      expect(result).toEqual([]);
    });

    it("should handle sets with zero items", async () => {
      const mockData = [
        {
          id: "set-1",
          name: "Empty Set",
          user_id: "user-123",
          set_items: [],
        },
      ];

      mockSupabase.order.mockResolvedValue({
        data: mockData,
        error: null,
      });

      const result = await getAllUserSetsWithCounts(mockSupabase as unknown as SupabaseClient, "user-123");

      expect(result[0].item_count).toBe(0);
    });

    it("should handle sets with null set_items", async () => {
      const mockData = [
        {
          id: "set-1",
          name: "Set",
          user_id: "user-123",
          set_items: null,
        },
      ];

      mockSupabase.order.mockResolvedValue({
        data: mockData,
        error: null,
      });

      const result = await getAllUserSetsWithCounts(mockSupabase as unknown as SupabaseClient, "user-123");

      expect(result[0].item_count).toBe(0);
    });

    it("should query with correct parameters", async () => {
      mockSupabase.order.mockResolvedValue({
        data: [],
        error: null,
      });

      await getAllUserSetsWithCounts(mockSupabase as unknown as SupabaseClient, "user-123");

      expect(mockSupabase.from).toHaveBeenCalledWith("sets");
      expect(mockSupabase.select).toHaveBeenCalledWith(expect.stringContaining("set_items"));
      expect(mockSupabase.eq).toHaveBeenCalledWith("user_id", "user-123");
      expect(mockSupabase.order).toHaveBeenCalledWith("name");
    });

    it("should order sets by name", async () => {
      const mockData = [
        {
          id: "set-1",
          name: "Alpha",
          user_id: "user-123",
          set_items: [],
        },
        {
          id: "set-2",
          name: "Beta",
          user_id: "user-123",
          set_items: [],
        },
      ];

      mockSupabase.order.mockResolvedValue({
        data: mockData,
        error: null,
      });

      const result = await getAllUserSetsWithCounts(mockSupabase as unknown as SupabaseClient, "user-123");

      expect(result[0].name).toBe("Alpha");
      expect(result[1].name).toBe("Beta");
      expect(mockSupabase.order).toHaveBeenCalledWith("name");
    });

    it("should throw error on database failure", async () => {
      const dbError = {
        code: "DATABASE_ERROR",
        message: "Query failed",
      };

      mockSupabase.order.mockResolvedValue({
        data: null,
        error: dbError,
      });

      await expect(
        getAllUserSetsWithCounts(mockSupabase as unknown as SupabaseClient, "user-123")
      ).rejects.toMatchObject({
        code: "DATABASE_ERROR",
      });
    });

    it("should filter by user_id to ensure isolation", async () => {
      mockSupabase.order.mockResolvedValue({
        data: [],
        error: null,
      });

      await getAllUserSetsWithCounts(mockSupabase as unknown as SupabaseClient, "user-123");

      // Verify RLS enforcement via user_id filter
      expect(mockSupabase.eq).toHaveBeenCalledWith("user_id", "user-123");
    });
  });
});
