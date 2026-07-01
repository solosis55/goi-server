import { NextResponse } from "next/server";
import { isPgUniqueViolation } from "@/lib/auth/pgErrors";
import { hashPassword } from "@/lib/auth/password";
import { jsonError, validationError } from "@/lib/http/apiError";
import { registerSchema } from "@/lib/schemas/authSchema";
import { mapUserRowToSafeUser } from "@/lib/users/types";
import { createUser, emailExists } from "@/lib/users/repository";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationError([{ message: "JSON no válido" }]);
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error.flatten());
  }

  const { username, email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  try {
    if (await emailExists(normalizedEmail)) {
      return jsonError(409, "AUTH_EMAIL_IN_USE", "email already in use");
    }

    const passwordHash = await hashPassword(password);
    const user = await createUser({
      username,
      email: normalizedEmail,
      passwordHash,
    });

    return NextResponse.json(
      {
        message: "user registered",
        user: mapUserRowToSafeUser(user, { includeEmail: true, isOwner: true }),
        requiresEmailVerification: true,
      },
      { status: 201 }
    );
  } catch (err) {
    if (isPgUniqueViolation(err, "username")) {
      return jsonError(409, "AUTH_USERNAME_IN_USE", "username already in use");
    }
    if (isPgUniqueViolation(err, "email")) {
      return jsonError(409, "AUTH_EMAIL_IN_USE", "email already in use");
    }
    console.error("[register]", err);
    return jsonError(500, "API_ERROR", "No se pudo registrar el usuario");
  }
}
