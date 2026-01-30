import { vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Creates a mock Supabase client for testing
 * Returns a partial mock with commonly used methods
 */
export function createMockSupabaseClient(): Partial<SupabaseClient> {
  return {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    // @ts-expect-error - Partial mock for testing
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(),
      getUser: vi.fn(),
    },
  };
}

/**
 * Helper to create mock fetch responses
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createMockResponse(data: any, status = 200, ok = true): Response {
  return {
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    json: async () => data,
    text: async () => JSON.stringify(data),
    headers: new Headers(),
    redirected: false,
    type: "basic",
    url: "",
    clone: vi.fn(),
    body: null,
    bodyUsed: false,
    arrayBuffer: vi.fn(),
    blob: vi.fn(),
    formData: vi.fn(),
  } as Response;
}

/**
 * Helper to wait for promises and timers
 */
export async function waitFor(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Helper to create mock Zod validation error
 */
export function createZodError(field: string, message: string) {
  return {
    issues: [
      {
        code: "custom",
        path: [field],
        message,
      },
    ],
    name: "ZodError",
  };
}
