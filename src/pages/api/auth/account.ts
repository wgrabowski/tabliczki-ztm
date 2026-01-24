import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";

import { createSupabaseServerInstance } from "../../../db/supabase.client.ts";
import type { Database } from "../../../db/database.types.ts";
import type { ErrorResponse } from "../../../types.ts";

export const prerender = false;

export const DELETE: APIRoute = async ({ cookies, request }) => {
  const supabase = createSupabaseServerInstance({ headers: request.headers, cookies });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response(
      JSON.stringify({ code: "UNAUTHORIZED", message: "Authentication required" } satisfies ErrorResponse),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return new Response(
      JSON.stringify({
        code: "CONFIG_ERROR",
        message: "Missing SUPABASE_SERVICE_ROLE_KEY on server",
      } satisfies ErrorResponse),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // Clear current session cookies first (best-effort)
  await supabase.auth.signOut();

  const admin = createClient<Database>(import.meta.env.SUPABASE_URL, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    return new Response(
      JSON.stringify({
        code: "DELETE_ACCOUNT_FAILED",
        message: "Nie udało się usunąć konta",
      } satisfies ErrorResponse),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(null, { status: 204 });
};
