import type { APIRoute } from "astro";

import { createSupabaseServerInstance } from "../../../db/supabase.client.ts";
import { registerCommandSchema } from "@lib/validation/auth.validation.ts";
import type { ErrorResponse } from "@types";

export const prerender = false;

function mapRegisterErrorMessage(message: string): { code: string; message: string; status: number } {
  const lower = message.toLowerCase();
  if (lower.includes("already registered") || lower.includes("user already registered")) {
    return { code: "USER_ALREADY_EXISTS", message: "Użytkownik z tym adresem e-mail już istnieje", status: 409 };
  }
  return { code: "REGISTER_FAILED", message: "Nie udało się utworzyć konta", status: 400 };
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

  const parse = registerCommandSchema.safeParse(body);
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

  const { data, error } = await supabase.auth.signUp({
    email: parse.data.email,
    password: parse.data.password,
  });

  if (error) {
    const mapped = mapRegisterErrorMessage(error.message);
    return new Response(JSON.stringify({ code: mapped.code, message: mapped.message } satisfies ErrorResponse), {
      status: mapped.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  // If email confirmation is enabled in Supabase, session may be null.
  const requiresEmailConfirmation = !data.session;

  return new Response(
    JSON.stringify({
      user: data.user ? { id: data.user.id, email: data.user.email ?? null } : null,
      requires_email_confirmation: requiresEmailConfirmation,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};
