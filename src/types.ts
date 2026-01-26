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

// ============================================================================
// Dashboard View Types
// ============================================================================

/**
 * Toast notification type
 */
export interface Toast {
  /** Unique identifier (timestamp + random) */
  id: string;
  /** Notification type (affects styling) */
  type: "success" | "error" | "info" | "warning";
  /** Message text */
  message: string;
  /** Whether to auto-dismiss (true for success/info) */
  autoDismiss: boolean;
}

/**
 * Confirm dialog state
 */
export interface ConfirmDialogState {
  /** Whether dialog is open */
  isOpen: boolean;
  /** Dialog title */
  title: string;
  /** Confirmation message */
  message: string;
  /** Callback executed on confirmation */
  onConfirm: () => void;
}

// ============================================================================
// Set Dashboard View Types
// ============================================================================

/**
 * Dane początkowe przekazywane z SSR do SetDashboardView
 */
export interface SetDashboardInitialData {
  /** Set ID (UUID) */
  setId: string;
  /** List of items in the set */
  items: SetItemDTO[];
  /** All user's sets (for SetSelect) */
  sets: SetDTO[];
  // Note: departures are NOT passed - loaded in onMount() without blocking rendering
  // Note: allStops are NOT passed - loaded by stopsStore client-side
  // Note: stops metadata is NOT passed - loaded in onMount() without blocking rendering
}

/**
 * Stan lokalny widoku SetDashboardView
 */
export interface SetDashboardState {
  /** Items in the set */
  items: SetItemDTO[];
  /** Departures data (null until first load) */
  departuresData: import("./ztm-types").GetZtmSetDeparturesResponse | null;
  /** Stop metadata - dictionary keyed by stop_id */
  stopsData: Record<number, import("./ztm-types").ZtmSetStopDTO>;
  /** Consecutive error count (0-3) */
  errorCount: number;
  /** True during fetch */
  isRefreshing: boolean;
  /** True before first departures load */
  isInitialLoad: boolean;
  /** True after 3 errors (cycle stopped) */
  isCycleStopped: boolean;
  /** Whether add dialog is open */
  isAddDialogOpen: boolean;
  /** Confirm dialog state */
  confirmDialog: ConfirmDialogState;
}

/**
 * Dane pojedynczej karty przystanku (StopCard)
 */
export interface StopCardData {
  /** UUID set_item */
  itemId: string;
  /** ZTM stop ID */
  stopId: number;
  /** Stop metadata (may be null) */
  stop: import("./ztm-types").ZtmStopDTO | null;
  /** Position in set */
  position: number;
  /** Departures for this stop (null during loading) */
  departures: import("./ztm-types").ZtmDepartureDTO[] | null;
  /** Error for this stop (if any) */
  error: import("./ztm-types").ZtmSetStopDeparturesErrorDTO | null;
}

/**
 * Stan paska postępu odświeżania
 */
export interface RefreshProgressState {
  /** Seconds left (0-60) */
  secondsLeft: number;
  /** True during fetch */
  isRefreshing: boolean;
  /** Error count for visual state */
  errorCount: number;
}
