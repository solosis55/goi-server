import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email("email inválido"),
  password: z.string().min(1, "password es obligatorio"),
});

export const registerSchema = z.object({
  username: z.string().trim().min(3).max(24),
  email: z.string().trim().email("email inválido"),
  password: z.string().min(8, "password mínimo 8 caracteres"),
});
