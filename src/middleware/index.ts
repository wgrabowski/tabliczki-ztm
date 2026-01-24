import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { defineMiddleware } from "astro:middleware";

import type { Database } from "../db/database.types.ts";

/**
 * Middleware to initialize Supabase client for each request
 * Supports both cookie-based sessions and Authorization header
 *
 * **Development Mode:**
 * When DEV_USER_ID is set, uses service_role key to bypass RLS policies
 * This allows RLS policies using auth.uid() to work in dev mode
 */
export const onRequest = defineMiddleware(async (context, next) => {
  // Development mode: Use service_role client to bypass RLS
  // This is necessary because RLS policies check auth.uid() which is NULL without a real session
  const devUserId = import.meta.env.DEV_USER_ID;
  if (devUserId) {
    // In local development, service_role key is:
    // eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
    const serviceRoleKey =
      import.meta.env.SUPABASE_SERVICE_ROLE_KEY ||
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

    context.locals.supabase = createClient<Database>(import.meta.env.SUPABASE_URL, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    return next();
  }

  // Production mode: Use SSR client with cookie-based sessions
  const authHeader = context.request.headers.get("Authorization");
  let accessToken: string | undefined;

  if (authHeader?.startsWith("Bearer ")) {
    accessToken = authHeader.substring(7);
  }

  context.locals.supabase = createServerClient<Database>(import.meta.env.SUPABASE_URL, import.meta.env.SUPABASE_KEY, {
    cookies: {
      get: (key) => context.cookies.get(key)?.value,
      set: (key, value, options) => {
        context.cookies.set(key, value, options);
      },
      remove: (key, options) => {
        context.cookies.delete(key, options);
      },
    },
    global: {
      headers: accessToken
        ? {
            Authorization: `Bearer ${accessToken}`,
          }
        : {},
    },
  });

  return next();
});
