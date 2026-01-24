// TODO: Integration tests improvements
// These tests are placeholders and need fixes to work properly

/**
 * ISSUE 1: Mock APIContext needs complete Request object with URL
 *
 * Current error: Cannot read properties of undefined (reading 'searchParams')
 *
 * Fix: Update createMockAPIContext to include full URL object
 */

// Example fix in src/tests/helpers/mocks.ts:
export function createMockAPIContext(overrides = {}) {
  const url = overrides.url || "http://localhost:4321/api/test";
  const requestUrl = new URL(url);

  return {
    request: new Request(requestUrl, {
      method: overrides.method || "GET",
      ...(overrides.request || {}),
    }),
    url: requestUrl, // Add URL object
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
 * ISSUE 2: Supabase mock needs proper chaining for insert().select()
 *
 * Current error: supabase.from(...).insert(...).select is not a function
 *
 * Fix: Make Supabase mock methods return chainable objects
 */

// Example fix in src/tests/helpers/mocks.ts:
export function createMockSupabaseClient(): SupabaseClient {
  const chainable = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  };

  return {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(),
      getUser: vi.fn(),
    },
    from: vi.fn(() => chainable),
    rpc: vi.fn(),
  } as unknown as SupabaseClient;
}

/**
 * ISSUE 3: Integration tests import modules that require env vars
 *
 * Current error: supabaseUrl is required
 *
 * Solutions:
 * A) Mock Supabase client at module level using vi.mock()
 * B) Provide valid test env vars in setup.ts
 */

// Option A - Mock at module level (in each test file):
vi.mock("@/db/supabase.client", () => ({
  supabaseClient: createMockSupabaseClient(),
}));

// Option B - Better env vars in src/tests/setup.ts:
vi.stubEnv("PUBLIC_SUPABASE_URL", "https://test.supabase.co");
vi.stubEnv("PUBLIC_SUPABASE_ANON_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...");

/**
 * NOTE: These integration tests are OPTIONAL for MVP
 *
 * The validation tests are working and provide good coverage.
 * Integration tests can be improved later when:
 * 1. We have a test database set up
 * 2. We can test against real Supabase (safer than complex mocks)
 */
