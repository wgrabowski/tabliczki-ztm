import { z } from "zod";

/**
 * Zod schema for creating a new set
 * Validates that the name is a string between 1-10 characters after trimming
 */
export const createSetCommandSchema = z.object({
  name: z
    .string({ required_error: "Set name is required" })
    .trim()
    .min(1, "Set name must be at least 1 character")
    .max(10, "Set name must be at most 10 characters"),
});

/**
 * Type inference from the Zod schema
 */
export type CreateSetCommandInput = z.infer<typeof createSetCommandSchema>;
