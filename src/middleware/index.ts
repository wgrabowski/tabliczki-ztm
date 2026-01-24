import { createServerClient } from "@supabase/ssr";
import { defineMiddleware } from "astro:middleware";

import type { Database } from "../db/database.types.ts";

/**
 * Middleware to initialize Supabase client for each request
 * Supports both cookie-based sessions and Authorization header
 */
export const onRequest = defineMiddleware(async (context, next) => {
  // Check if Authorization header is present (for API requests)
  const authHeader = context.request.headers.get("Authorization");
  let accessToken: string | undefined;

  if (authHeader?.startsWith("Bearer ")) {
    accessToken = authHeader.substring(7);
  }

  // Create a Supabase client for the current request
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
