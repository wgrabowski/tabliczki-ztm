import { defineMiddleware } from "astro:middleware";
import { createSupabaseServerInstance } from "../db/supabase.client.ts";

/**
 * Middleware to initialize Supabase client for each request
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const { cookies, locals, request, redirect, url } = context;

  const supabase = createSupabaseServerInstance({ headers: request.headers, cookies });
  locals.supabase = supabase;

  const isPublicApi = url.pathname.startsWith("/api/ztm") || url.pathname.startsWith("/api/auth");
  const isProtectedApi = url.pathname.startsWith("/api") && !isPublicApi;
  const isProtectedPage = url.pathname === "/account" || url.pathname.startsWith("/dashboard");

  if (!isProtectedApi && !isProtectedPage) {
    return next();
  }

  // IMPORTANT: Always get user session first before any other operations
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    locals.user = { id: user.id, email: user.email ?? null };
    return next();
  }

  if (isProtectedApi) {
    return new Response(JSON.stringify({ code: "UNAUTHORIZED", message: "Authentication required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const returnUrl = `${url.pathname}${url.search}`;
  return redirect(`/auth/login?returnUrl=${encodeURIComponent(returnUrl)}`);
});
