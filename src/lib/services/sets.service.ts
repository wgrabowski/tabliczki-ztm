import type { SupabaseClient } from "../../db/supabase.client.ts";
import type { SetDTO, SetEntity } from "../../types.ts";

/**
 * Creates a new set for a user
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID from authenticated session
 * @param name - Set name (will be trimmed before insert)
 * @returns The newly created set entity
 * @throws Error if database operation fails (duplicate name, max sets exceeded, etc.)
 */
export async function createSet(supabase: SupabaseClient, userId: string, name: string): Promise<SetEntity> {
  const { data, error } = await supabase.from("sets").insert({ name: name.trim(), user_id: userId }).select().single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Failed to create set: no data returned");
  }

  return data;
}

/**
 * Updates an existing set's name
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID from authenticated session
 * @param setId - UUID of the set to update
 * @param name - New set name (will be trimmed before update)
 * @returns The updated set entity
 * @throws Error if set not found, not owned by user, duplicate name, or database error
 */
export async function updateSet(
  supabase: SupabaseClient,
  userId: string,
  setId: string,
  name: string
): Promise<SetEntity> {
  const { data, error } = await supabase
    .from("sets")
    .update({ name: name.trim() })
    .eq("id", setId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    // PostgREST returns PGRST116 when no rows match the update condition
    if (error.code === "PGRST116") {
      const notFoundError = new Error("SET_NOT_FOUND") as Error & { code: "SET_NOT_FOUND" };
      notFoundError.code = "SET_NOT_FOUND";
      throw notFoundError;
    }
    throw error;
  }

  if (!data) {
    const notFoundError = new Error("SET_NOT_FOUND") as Error & { code: "SET_NOT_FOUND" };
    notFoundError.code = "SET_NOT_FOUND";
    throw notFoundError;
  }

  return data;
}

/**
 * Deletes a set and all its associated items (cascade delete)
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID from authenticated session
 * @param setId - UUID of the set to delete
 * @throws Error with code 'SET_NOT_FOUND' if set doesn't exist or user doesn't own it
 * @throws Error if database operation fails
 */
export async function deleteSet(supabase: SupabaseClient, userId: string, setId: string): Promise<void> {
  // Delete set with ownership verification
  // Using .select() to check if any rows were actually deleted
  const { data, error } = await supabase.from("sets").delete().eq("id", setId).eq("user_id", userId).select();

  if (error) {
    throw error;
  }

  // Check if a record was actually deleted
  if (!data || data.length === 0) {
    const notFoundError = new Error("SET_NOT_FOUND") as Error & { code: "SET_NOT_FOUND" };
    notFoundError.code = "SET_NOT_FOUND";
    throw notFoundError;
  }
}

/**
 * Retrieves all sets for a user with item counts
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID from authenticated session
 * @returns Array of SetDTO with item counts
 * @throws Error if database operation fails
 */
export async function getAllUserSetsWithCounts(supabase: SupabaseClient, userId: string): Promise<SetDTO[]> {
  // Query sets with item counts using aggregation
  const { data, error } = await supabase
    .from("sets")
    .select(
      `
      id,
      name,
      user_id,
      set_items (
        id
      )
    `
    )
    .eq("user_id", userId)
    .order("name");

  if (error) {
    throw error;
  }

  if (!data) {
    return [];
  }

  // Transform data to SetDTO format with item_count
  return data.map((set) => ({
    id: set.id,
    name: set.name,
    user_id: set.user_id,
    item_count: Array.isArray(set.set_items) ? set.set_items.length : 0,
  }));
}
