import { z } from "zod";

export const authEmailSchema = z
  .string()
  .trim()
  .min(1, "Adres e-mail jest wymagany")
  .email("Nieprawidłowy format adresu e-mail");

export const authPasswordSchema = z.string().min(6, "Hasło musi mieć co najmniej 6 znaków");

export const loginCommandSchema = z.object({
  email: authEmailSchema,
  password: authPasswordSchema,
});

export const registerCommandSchema = z.object({
  email: authEmailSchema,
  password: authPasswordSchema,
});
