import { vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Creates a mocked Supabase client for testing
 */
export function createMockSupabaseClient(): SupabaseClient {
  return {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(),
      getUser: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
    rpc: vi.fn(),
  } as unknown as SupabaseClient;
}

/**
 * Creates a mock API context for Astro endpoints
 */
export function createMockAPIContext(overrides = {}) {
  return {
    request: new Request("http://localhost:4321/api/test"),
    cookies: {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
      has: vi.fn(),
    },
    locals: {
      supabase: createMockSupabaseClient(),
    },
    redirect: vi.fn(),
    ...overrides,
  };
}

/**
 * Creates a mock fetch response
 */
export function createMockResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
