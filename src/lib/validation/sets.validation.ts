import { z } from "zod";

/**
 * Zod schema for creating a new set
 * Validates that the name is a string between 1-20 characters after trimming
 */
export const createSetCommandSchema = z.object({
  name: z
    .string({ required_error: "Set name is required" })
    .trim()
    .min(1, "Set name must be at least 1 character")
    .max(20, "Set name must be at most 20 characters"),
});

/**
 * Type inference from the Zod schema
 */
export type CreateSetCommandInput = z.infer<typeof createSetCommandSchema>;

/**
 * Zod schema for updating a set
 * Validates that the name is a string between 1-20 characters after trimming
 */
export const updateSetCommandSchema = z.object({
  name: z
    .string({ required_error: "Set name is required" })
    .trim()
    .min(1, "Set name must be at least 1 character")
    .max(20, "Set name must be at most 20 characters"),
});

/**
 * Type inference from the Zod schema
 */
export type UpdateSetCommandInput = z.infer<typeof updateSetCommandSchema>;

/**
 * Zod schema for GET /api/sets query parameters
 * Validates optional include_items boolean parameter
 */
export const getSetsQuerySchema = z.object({
  include_items: z.coerce.boolean().optional().default(false),
});

/**
 * Type inference from the Zod schema
 */
export type GetSetsQueryInput = z.infer<typeof getSetsQuerySchema>;

/**
 * Zod schema for validating setId URL parameter
 * Used in DELETE and PATCH operations on /api/sets/{setId}
 */
export const deleteSetParamsSchema = z.object({
  setId: z.string().uuid("Invalid set ID format"),
});

/**
 * Type inference from the Zod schema
 */
export type DeleteSetParamsInput = z.infer<typeof deleteSetParamsSchema>;

/**
 * Zod schema for creating a new set item (adding stop to set)
 * Validates that the stop_id is a positive integer
 */
export const createSetItemCommandSchema = z.object({
  stop_id: z
    .number({ required_error: "Stop ID is required" })
    .int("Stop ID must be an integer")
    .positive("Stop ID must be a positive integer"),
});

/**
 * Type inference from the Zod schema
 */
export type CreateSetItemCommandInput = z.infer<typeof createSetItemCommandSchema>;
