import type { Tables, TablesInsert } from "./db/database.types";

// ============================================================================
// Entity Types (from Database)
// ============================================================================

/**
 * Set entity - represents a user-owned dashboard configuration
 */
export type SetEntity = Tables<"sets">;

/**
 * SetItem entity - links a set to a stop_id with position
 */
export type SetItemEntity = Tables<"set_items">;

// ============================================================================
// Set DTOs
// ============================================================================

/**
 * Set Data Transfer Object for API responses
 * Extends the base entity with computed metadata fields
 */
export interface SetDTO {
  /** Unique identifier (UUID) */
  id: string;
  /** Set name (1-10 characters, trimmed) */
  name: string;
  /** Owner's user ID */
  user_id: string;
  /** Number of items in this set */
  item_count: number;
  /** Optional creation timestamp */
  created_at?: string;
}

/**
 * Simplified Set DTO without user_id for public responses
 */
export type SetDTOPublic = Omit<SetDTO, "user_id">;

// ============================================================================
// Set Command Models (Input)
// ============================================================================

/**
 * Command to create a new set
 * Name must be 1-10 characters after trimming
 */
export interface CreateSetCommand {
  /** Set name (will be trimmed, must be 1-10 chars) */
  name: string;
}

/**
 * Command to update an existing set
 */
export interface UpdateSetCommand {
  /** New set name (will be trimmed, must be 1-10 chars) */
  name: string;
}

// ============================================================================
// Set API Response Types
// ============================================================================

/**
 * Response for GET /api/sets - list all user's sets
 */
export interface SetListResponse {
  /** Array of user's sets with metadata */
  sets: SetDTO[];
  /** Total number of sets */
  total_count: number;
}

/**
 * Response for POST /api/sets - create a new set
 */
export interface CreateSetResponse {
  /** Updated list of all user's sets */
  sets: SetDTO[];
  /** The newly created set */
  created_set: Pick<SetDTO, "id" | "name">;
}

/**
 * Response for PATCH /api/sets/{setId} - update a set
 */
export interface UpdateSetResponse {
  /** Updated list of all user's sets */
  sets: SetDTO[];
  /** The updated set */
  updated_set: Pick<SetDTO, "id" | "name">;
}

/**
 * Response for DELETE /api/sets/{setId} - delete a set
 */
export interface DeleteSetResponse {
  /** Updated list of remaining user's sets */
  sets: SetDTO[];
  /** ID of the deleted set */
  deleted_set_id: string;
}

// ============================================================================
// SetItem DTOs
// ============================================================================

/**
 * SetItem Data Transfer Object for API responses
 * Represents a stop card within a set
 */
export interface SetItemDTO {
  /** Unique identifier (UUID) */
  id: string;
  /** Foreign key to the parent set */
  set_id: string;
  /** ZTM stop ID (external reference) */
  stop_id: number;
  /** Position in the set (1-based, auto-assigned) */
  position: number;
  /** Optional timestamp when item was added */
  added_at?: string;
}

/**
 * Simplified SetItem DTO without set_id when context is clear
 */
export type SetItemDTOSimple = Omit<SetItemDTO, "set_id">;

// ============================================================================
// SetItem Command Models (Input)
// ============================================================================

/**
 * Command to add a new item to a set
 * Position is auto-assigned by the database
 */
export interface CreateSetItemCommand {
  /** ZTM stop ID to add to the set */
  stop_id: number;
}

// ============================================================================
// SetItem API Response Types
// ============================================================================

/**
 * Response for GET /api/sets/{setId}/items - list items in a set
 */
export interface SetItemListResponse {
  /** Array of items in the set, ordered by position */
  items: SetItemDTO[];
  /** Total number of items in the set */
  total_count: number;
}

/**
 * Response for POST /api/sets/{setId}/items - add item to set
 */
export interface CreateSetItemResponse {
  /** Updated list of all items in the set */
  items: SetItemDTO[];
  /** The newly created item */
  created_item: Pick<SetItemDTO, "id" | "stop_id" | "position">;
}

/**
 * Response for DELETE /api/sets/{setId}/items/{itemId} - remove item
 */
export interface DeleteSetItemResponse {
  /** Updated list of remaining items in the set */
  items: SetItemDTO[];
  /** ID of the deleted item */
  deleted_item_id: string;
}

// ============================================================================
// Database Insert Types (for internal use)
// ============================================================================

/**
 * Type for inserting a new set into the database
 * Derived from database schema, user_id must be provided
 */
export type SetInsert = TablesInsert<"sets">;

/**
 * Type for inserting a new set item into the database
 * Derived from database schema, position and set_id must be provided
 */
export type SetItemInsert = TablesInsert<"set_items">;

// ============================================================================
// Error Response Types
// ============================================================================

/**
 * Standard error response structure
 */
export interface ErrorResponse {
  /** Error code for client handling */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Optional additional error details */
  details?: unknown;
}

/**
 * Known error codes from business logic and database constraints
 */
export type ErrorCode =
  | "MAX_SETS_PER_USER_EXCEEDED"
  | "MAX_ITEMS_PER_SET_EXCEEDED"
  | "SET_ITEM_ALREADY_EXISTS"
  | "DUPLICATE_SET_NAME"
  | "INVALID_SET_NAME"
  | "INVALID_STOP_ID"
  | "SET_NOT_FOUND"
  | "ITEM_NOT_FOUND"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "INTERNAL_ERROR";
