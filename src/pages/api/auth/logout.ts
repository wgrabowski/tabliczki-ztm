import type { APIRoute } from "astro";

import { createSupabaseServerInstance } from "../../../db/supabase.client.ts";
import type { ErrorResponse } from "../../../types.ts";

export const prerender = false;

export const POST: APIRoute = async ({ cookies, request }) => {
  const supabase = createSupabaseServerInstance({ headers: request.headers, cookies });

  const { error } = await supabase.auth.signOut();
  if (error) {
    return new Response(
      JSON.stringify({ code: "LOGOUT_FAILED", message: "Nie udało się wylogować" } satisfies ErrorResponse),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(null, { status: 200 });
};
