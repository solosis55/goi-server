import { NextResponse } from "next/server";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { signAuthToken } from "@/lib/auth/jwt";
import { jsonError, validationError } from "@/lib/http/apiError";
import { loginSchema } from "@/lib/schemas/authSchema";
import { mapUserRowToSafeUser } from "@/lib/users/types";
import { findUserByEmail, updateUserPasswordHash } from "@/lib/users/repository";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationError([{ message: "JSON no válido" }]);
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error.flatten());
  }

  const { email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  try {
    const user = await findUserByEmail(normalizedEmail);
    if (!user) {
      return jsonError(401, "AUTH_INVALID_CREDENTIALS", "invalid credentials");
    }

    let valid = await verifyPassword(password, user.password_hash);
    if (!valid && user.password_hash === password) {
      const hashed = await hashPassword(password);
      await updateUserPasswordHash(user.id, hashed);
      valid = true;
    }
    if (!valid) {
      return jsonError(401, "AUTH_INVALID_CREDENTIALS", "invalid credentials");
    }

    if (!user.email_verified) {
      return jsonError(403, "AUTH_EMAIL_NOT_VERIFIED", "email not verified");
    }

    return NextResponse.json({
      message: "login successful",
      user: mapUserRowToSafeUser(user),
      token: signAuthToken(user.id),
    });
  } catch {
    return jsonError(500, "API_ERROR", "No se pudo iniciar sesión");
  }
}
