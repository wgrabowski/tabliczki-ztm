import { describe, it, expect, vi, beforeEach } from "vitest";
import { verifySetOwnership, createSetItem, getAllSetItems, deleteSetItem } from "./set-items.service";
import type { SupabaseClient } from "../../db/supabase.client";

describe("Set Items Service", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
    };
  });

  describe("verifySetOwnership", () => {
    it("should verify ownership successfully", async () => {
      mockSupabase.single.mockResolvedValue({
        data: { id: "set-id" },
        error: null,
      });

      await expect(
        verifySetOwnership(mockSupabase as unknown as SupabaseClient, "user-123", "set-id")
      ).resolves.not.toThrow();

      expect(mockSupabase.from).toHaveBeenCalledWith("sets");
      expect(mockSupabase.select).toHaveBeenCalledWith("id");
      expect(mockSupabase.eq).toHaveBeenCalledWith("id", "set-id");
      expect(mockSupabase.eq).toHaveBeenCalledWith("user_id", "user-123");
    });

    it("should throw SET_NOT_FOUND when set does not exist", async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "No rows found" },
      });

      await expect(
        verifySetOwnership(mockSupabase as unknown as SupabaseClient, "user-123", "nonexistent-id")
      ).rejects.toMatchObject({
        code: "SET_NOT_FOUND",
        message: "SET_NOT_FOUND",
      });
    });

    it("should throw SET_NOT_FOUND when user does not own set", async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: null,
      });

      await expect(
        verifySetOwnership(mockSupabase as unknown as SupabaseClient, "user-123", "other-user-set")
      ).rejects.toMatchObject({
        code: "SET_NOT_FOUND",
      });
    });

    it("should throw SET_NOT_FOUND on database error", async () => {
      const dbError = {
        code: "DATABASE_ERROR",
        message: "Connection failed",
      };

      mockSupabase.single.mockResolvedValue({
        data: null,
        error: dbError,
      });

      await expect(
        verifySetOwnership(mockSupabase as unknown as SupabaseClient, "user-123", "set-id")
      ).rejects.toMatchObject({
        code: "SET_NOT_FOUND",
      });
    });

    it("should use both set_id and user_id filters", async () => {
      mockSupabase.single.mockResolvedValue({
        data: { id: "set-id" },
        error: null,
      });

      await verifySetOwnership(mockSupabase as unknown as SupabaseClient, "user-123", "set-id");

      expect(mockSupabase.eq).toHaveBeenCalledTimes(2);
      expect(mockSupabase.eq).toHaveBeenCalledWith("id", "set-id");
      expect(mockSupabase.eq).toHaveBeenCalledWith("user_id", "user-123");
    });
  });

  describe("createSetItem", () => {
    it("should create set item successfully", async () => {
      const mockItem = {
        id: "item-id",
        set_id: "set-id",
        stop_id: 117,
        position: 1,
      };

      mockSupabase.single.mockResolvedValue({
        data: mockItem,
        error: null,
      });

      const result = await createSetItem(mockSupabase as unknown as SupabaseClient, "set-id", 117);

      expect(result).toEqual(mockItem);
      expect(mockSupabase.from).toHaveBeenCalledWith("set_items");
      expect(mockSupabase.insert).toHaveBeenCalledWith({
        set_id: "set-id",
        stop_id: 117,
        position: null, // Trigger assigns position
      });
    });

    it("should insert with position null (trigger assigns)", async () => {
      mockSupabase.single.mockResolvedValue({
        data: { id: "item-id", set_id: "set-id", stop_id: 117, position: 2 },
        error: null,
      });

      await createSetItem(mockSupabase as unknown as SupabaseClient, "set-id", 117);

      expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({ position: null }));
    });

    it("should throw error on duplicate stop_id in set", async () => {
      const duplicateError = {
        code: "23505",
        constraint: "set_items_set_id_stop_id_uniq",
        message: "duplicate key value",
      };

      mockSupabase.single.mockResolvedValue({
        data: null,
        error: duplicateError,
      });

      await expect(createSetItem(mockSupabase as unknown as SupabaseClient, "set-id", 117)).rejects.toMatchObject({
        code: "23505",
        constraint: "set_items_set_id_stop_id_uniq",
      });
    });

    it("should throw error when max items (6) exceeded", async () => {
      const maxItemsError = {
        message: "MAX_ITEMS_PER_SET_EXCEEDED",
      };

      mockSupabase.single.mockResolvedValue({
        data: null,
        error: maxItemsError,
      });

      await expect(createSetItem(mockSupabase as unknown as SupabaseClient, "set-id", 117)).rejects.toMatchObject({
        message: "MAX_ITEMS_PER_SET_EXCEEDED",
      });
    });

    it("should throw error when no data returned", async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: null,
      });

      await expect(createSetItem(mockSupabase as unknown as SupabaseClient, "set-id", 117)).rejects.toThrow(
        "Failed to create set item: no data returned"
      );
    });

    it("should handle various stop IDs", async () => {
      const stopIds = [1, 117, 199, 9999];

      for (const stopId of stopIds) {
        mockSupabase.single.mockResolvedValue({
          data: { id: "item-id", set_id: "set-id", stop_id: stopId, position: 1 },
          error: null,
        });

        const result = await createSetItem(mockSupabase as unknown as SupabaseClient, "set-id", stopId);
        expect(result.stop_id).toBe(stopId);
      }
    });

    it("should auto-assign position via trigger", async () => {
      // First item gets position 1
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: "item-1", set_id: "set-id", stop_id: 117, position: 1 },
        error: null,
      });

      const first = await createSetItem(mockSupabase as unknown as SupabaseClient, "set-id", 117);
      expect(first.position).toBe(1);

      // Second item gets position 2
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: "item-2", set_id: "set-id", stop_id: 199, position: 2 },
        error: null,
      });

      const second = await createSetItem(mockSupabase as unknown as SupabaseClient, "set-id", 199);
      expect(second.position).toBe(2);
    });
  });

  describe("getAllSetItems", () => {
    it("should return all items ordered by position", async () => {
      const mockItems = [
        { id: "item-1", set_id: "set-id", stop_id: 117, position: 1 },
        { id: "item-2", set_id: "set-id", stop_id: 199, position: 2 },
        { id: "item-3", set_id: "set-id", stop_id: 250, position: 3 },
      ];

      mockSupabase.order.mockResolvedValue({
        data: mockItems,
        error: null,
      });

      const result = await getAllSetItems(mockSupabase as unknown as SupabaseClient, "set-id");

      expect(result).toEqual(mockItems);
      expect(mockSupabase.from).toHaveBeenCalledWith("set_items");
      expect(mockSupabase.select).toHaveBeenCalledWith("id, set_id, stop_id, position");
      expect(mockSupabase.eq).toHaveBeenCalledWith("set_id", "set-id");
      expect(mockSupabase.order).toHaveBeenCalledWith("position", { ascending: true });
    });

    it("should return empty array for set with no items", async () => {
      mockSupabase.order.mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await getAllSetItems(mockSupabase as unknown as SupabaseClient, "set-id");

      expect(result).toEqual([]);
    });

    it("should return empty array when data is null", async () => {
      mockSupabase.order.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await getAllSetItems(mockSupabase as unknown as SupabaseClient, "set-id");

      expect(result).toEqual([]);
    });

    it("should order items by position ascending", async () => {
      const mockItems = [
        { id: "item-3", set_id: "set-id", stop_id: 250, position: 3 },
        { id: "item-1", set_id: "set-id", stop_id: 117, position: 1 },
        { id: "item-2", set_id: "set-id", stop_id: 199, position: 2 },
      ];

      mockSupabase.order.mockResolvedValue({
        data: mockItems,
        error: null,
      });

      await getAllSetItems(mockSupabase as unknown as SupabaseClient, "set-id");

      expect(mockSupabase.order).toHaveBeenCalledWith("position", { ascending: true });
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

      await expect(getAllSetItems(mockSupabase as unknown as SupabaseClient, "set-id")).rejects.toMatchObject({
        code: "DATABASE_ERROR",
      });
    });

    it("should filter by set_id", async () => {
      mockSupabase.order.mockResolvedValue({
        data: [],
        error: null,
      });

      await getAllSetItems(mockSupabase as unknown as SupabaseClient, "set-id");

      expect(mockSupabase.eq).toHaveBeenCalledWith("set_id", "set-id");
    });

    it("should handle sets with max items (6)", async () => {
      const mockItems = Array.from({ length: 6 }, (_, i) => ({
        id: `item-${i + 1}`,
        set_id: "set-id",
        stop_id: 100 + i,
        position: i + 1,
      }));

      mockSupabase.order.mockResolvedValue({
        data: mockItems,
        error: null,
      });

      const result = await getAllSetItems(mockSupabase as unknown as SupabaseClient, "set-id");

      expect(result).toHaveLength(6);
      expect(result[0].position).toBe(1);
      expect(result[5].position).toBe(6);
    });

    it("should transform data to SetItemDTO format", async () => {
      const mockItems = [{ id: "item-1", set_id: "set-id", stop_id: 117, position: 1 }];

      mockSupabase.order.mockResolvedValue({
        data: mockItems,
        error: null,
      });

      const result = await getAllSetItems(mockSupabase as unknown as SupabaseClient, "set-id");

      expect(result[0]).toHaveProperty("id");
      expect(result[0]).toHaveProperty("set_id");
      expect(result[0]).toHaveProperty("stop_id");
      expect(result[0]).toHaveProperty("position");
    });
  });

  describe("deleteSetItem", () => {
    it("should delete set item successfully", async () => {
      const deletedItem = {
        id: "item-id",
        set_id: "set-id",
        stop_id: 117,
        position: 1,
      };

      mockSupabase.single.mockResolvedValue({
        data: deletedItem,
        error: null,
      });

      await deleteSetItem(mockSupabase as unknown as SupabaseClient, "set-id", "item-id");

      expect(mockSupabase.from).toHaveBeenCalledWith("set_items");
      expect(mockSupabase.delete).toHaveBeenCalled();
      expect(mockSupabase.eq).toHaveBeenCalledWith("id", "item-id");
      expect(mockSupabase.eq).toHaveBeenCalledWith("set_id", "set-id");
    });

    it("should verify item belongs to set", async () => {
      mockSupabase.single.mockResolvedValue({
        data: { id: "item-id" },
        error: null,
      });

      await deleteSetItem(mockSupabase as unknown as SupabaseClient, "set-id", "item-id");

      // Should filter by both item id AND set_id
      expect(mockSupabase.eq).toHaveBeenCalledWith("id", "item-id");
      expect(mockSupabase.eq).toHaveBeenCalledWith("set_id", "set-id");
    });

    it("should throw ITEM_NOT_FOUND when item does not exist", async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "No rows found" },
      });

      await expect(
        deleteSetItem(mockSupabase as unknown as SupabaseClient, "set-id", "nonexistent-id")
      ).rejects.toMatchObject({
        code: "ITEM_NOT_FOUND",
        message: "ITEM_NOT_FOUND",
      });
    });

    it("should throw ITEM_NOT_FOUND when item not in this set", async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: null,
      });

      await expect(
        deleteSetItem(mockSupabase as unknown as SupabaseClient, "set-id", "item-from-other-set")
      ).rejects.toMatchObject({
        code: "ITEM_NOT_FOUND",
      });
    });

    it("should throw ITEM_NOT_FOUND on database error", async () => {
      const dbError = {
        code: "DATABASE_ERROR",
        message: "Delete failed",
      };

      mockSupabase.single.mockResolvedValue({
        data: null,
        error: dbError,
      });

      await expect(deleteSetItem(mockSupabase as unknown as SupabaseClient, "set-id", "item-id")).rejects.toMatchObject(
        {
          code: "ITEM_NOT_FOUND",
        }
      );
    });

    it("should use select to verify deletion", async () => {
      mockSupabase.single.mockResolvedValue({
        data: { id: "item-id" },
        error: null,
      });

      await deleteSetItem(mockSupabase as unknown as SupabaseClient, "set-id", "item-id");

      expect(mockSupabase.select).toHaveBeenCalled();
      expect(mockSupabase.single).toHaveBeenCalled();
    });

    it("should handle deletion of first item", async () => {
      mockSupabase.single.mockResolvedValue({
        data: { id: "item-1", position: 1 },
        error: null,
      });

      await expect(deleteSetItem(mockSupabase as unknown as SupabaseClient, "set-id", "item-1")).resolves.not.toThrow();
    });

    it("should handle deletion of last item", async () => {
      mockSupabase.single.mockResolvedValue({
        data: { id: "item-6", position: 6 },
        error: null,
      });

      await expect(deleteSetItem(mockSupabase as unknown as SupabaseClient, "set-id", "item-6")).resolves.not.toThrow();
    });
  });

  describe("Integration scenarios", () => {
    it("should handle complete item lifecycle", async () => {
      // Create item
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: "item-1", set_id: "set-id", stop_id: 117, position: 1 },
        error: null,
      });

      const created = await createSetItem(mockSupabase as unknown as SupabaseClient, "set-id", 117);
      expect(created.id).toBe("item-1");

      // Get all items
      mockSupabase.order.mockResolvedValueOnce({
        data: [created],
        error: null,
      });

      const items = await getAllSetItems(mockSupabase as unknown as SupabaseClient, "set-id");
      expect(items).toHaveLength(1);

      // Delete item
      mockSupabase.single.mockResolvedValueOnce({
        data: created,
        error: null,
      });

      await deleteSetItem(mockSupabase as unknown as SupabaseClient, "set-id", "item-1");
    });

    it("should handle multiple items with sequential positions", async () => {
      const mockItems = [
        { id: "item-1", set_id: "set-id", stop_id: 117, position: 1 },
        { id: "item-2", set_id: "set-id", stop_id: 199, position: 2 },
        { id: "item-3", set_id: "set-id", stop_id: 250, position: 3 },
      ];

      mockSupabase.order.mockResolvedValue({
        data: mockItems,
        error: null,
      });

      const result = await getAllSetItems(mockSupabase as unknown as SupabaseClient, "set-id");

      // Verify positions are sequential
      result.forEach((item, index) => {
        expect(item.position).toBe(index + 1);
      });
    });
  });
});
