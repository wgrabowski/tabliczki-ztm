import type { SupabaseClient } from "../../db/supabase.client.ts";
import type { SetItemDTO, SetItemEntity } from "../../types.ts";

/**
 * Verifies that a set exists and belongs to the specified user
 *
 * This function performs an explicit ownership check before operations.
 * Note: RLS policies also enforce ownership, but this provides better
 * error messages and early validation.
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID from authenticated session
 * @param setId - UUID of the set to verify
 * @throws Error with code 'SET_NOT_FOUND' if set doesn't exist or user doesn't own it
 */
export async function verifySetOwnership(supabase: SupabaseClient, userId: string, setId: string): Promise<void> {
  const { data, error } = await supabase.from("sets").select("id").eq("id", setId).eq("user_id", userId).single();

  if (error || !data) {
    const notFoundError = new Error("SET_NOT_FOUND") as Error & { code: "SET_NOT_FOUND" };
    notFoundError.code = "SET_NOT_FOUND";
    throw notFoundError;
  }
}

/**
 * Creates a new set item (adds stop to set)
 *
 * Position is automatically assigned by the database trigger:
 * - Checks if set has < 6 items (raises exception if >= 6)
 * - Assigns position = MAX(position) + 1, or 1 if set is empty
 *
 * The trigger name is: enforce_set_items_limit_and_position()
 *
 * @param supabase - Supabase client instance
 * @param setId - UUID of the set to add item to
 * @param stopId - ZTM stop ID to add
 * @returns The newly created set item with assigned position
 * @throws Error if database operation fails (duplicate stop_id, max items exceeded, etc.)
 */
export async function createSetItem(supabase: SupabaseClient, setId: string, stopId: number): Promise<SetItemEntity> {
  // Insert with position NULL - trigger will assign it
  const { data, error } = await supabase
    .from("set_items")
    .insert({
      set_id: setId,
      stop_id: stopId,
      position: null, // Trigger assigns: max(position) + 1
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Failed to create set item: no data returned");
  }

  return data;
}

/**
 * Retrieves all items in a set, ordered by position
 *
 * @param supabase - Supabase client instance
 * @param setId - UUID of the set
 * @returns Array of SetItemDTO ordered by position (1-based, ascending)
 * @throws Error if database operation fails
 */
export async function getAllSetItems(supabase: SupabaseClient, setId: string): Promise<SetItemDTO[]> {
  const { data, error } = await supabase
    .from("set_items")
    .select("id, set_id, stop_id, position")
    .eq("set_id", setId)
    .order("position", { ascending: true });

  if (error) {
    throw error;
  }

  if (!data) {
    return [];
  }

  // Transform to SetItemDTO format
  return data.map((item) => ({
    id: item.id,
    set_id: item.set_id,
    stop_id: item.stop_id,
    position: item.position,
  }));
}

/**
 * Deletes a set item from the database
 *
 * Verifies that the item exists and belongs to the specified set.
 * Database trigger may automatically reindex positions of remaining items.
 *
 * @param supabase - Supabase client instance
 * @param setId - UUID of the set containing the item
 * @param itemId - UUID of the item to delete
 * @throws Error with code 'ITEM_NOT_FOUND' if item doesn't exist in this set
 */
export async function deleteSetItem(supabase: SupabaseClient, setId: string, itemId: string): Promise<void> {
  const { data, error } = await supabase
    .from("set_items")
    .delete()
    .eq("id", itemId)
    .eq("set_id", setId) // Ensures item belongs to this specific set
    .select()
    .single();

  if (error || !data) {
    const notFoundError = new Error("ITEM_NOT_FOUND") as Error & {
      code: "ITEM_NOT_FOUND";
    };
    notFoundError.code = "ITEM_NOT_FOUND";
    throw notFoundError;
  }
}
