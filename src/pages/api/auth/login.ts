import type { APIRoute } from "astro";

import { createSupabaseServerInstance } from "../../../db/supabase.client.ts";
import { loginCommandSchema } from "../../../lib/validation/auth.validation.ts";
import type { ErrorResponse } from "../../../types.ts";

export const prerender = false;

function mapLoginErrorMessage(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) return "Błędne dane logowania";
  if (lower.includes("email not confirmed")) return "Adres e-mail nie został potwierdzony";
  return "Nie udało się zalogować";
}

export const POST: APIRoute = async ({ request, cookies }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ code: "INVALID_INPUT", message: "Invalid JSON body" } satisfies ErrorResponse),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const parse = loginCommandSchema.safeParse(body);
  if (!parse.success) {
    return new Response(
      JSON.stringify({
        code: "INVALID_INPUT",
        message: parse.error.issues[0]?.message || "Invalid input",
        details: parse.error.issues,
      } satisfies ErrorResponse),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabase = createSupabaseServerInstance({ headers: request.headers, cookies });

  const { data, error } = await supabase.auth.signInWithPassword({
    email: parse.data.email,
    password: parse.data.password,
  });

  if (error) {
    return new Response(
      JSON.stringify({
        code: "UNAUTHORIZED",
        message: mapLoginErrorMessage(error.message),
      } satisfies ErrorResponse),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({
      user: data.user ? { id: data.user.id, email: data.user.email ?? null } : null,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};
