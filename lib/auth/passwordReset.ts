import { createHash, randomBytes } from "node:crypto";
import { query } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { findUserByEmail } from "@/lib/users/repository";
import { deliverPasswordResetEmail } from "@/lib/auth/passwordResetEmail";

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

function normalizeEmail(email: unknown): string {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

export function hashResetToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export async function requestPasswordReset(emailRaw: unknown): Promise<{
  message: string;
  devResetToken?: string;
}> {
  const normalizedEmail = normalizeEmail(emailRaw);
  if (!normalizedEmail) {
    throw Object.assign(new Error("email is required"), { code: "AUTH_FORGOT_PASSWORD_INVALID_INPUT" });
  }

  const message =
    "Si el correo está registrado, puedes completar el cambio de contraseña siguiendo las instrucciones enviadas (revisa también spam).";

  const user = await findUserByEmail(normalizedEmail);
  if (!user) {
    return { message };
  }

  const token = randomBytes(32).toString("hex");
  const tokenHash = hashResetToken(token);
  const expires = new Date(Date.now() + PASSWORD_RESET_TTL_MS).toISOString();

  await query(
    `UPDATE users SET
       password_reset_token_hash = $2,
       password_reset_expires = $3::timestamptz,
       updated_at = NOW()
     WHERE id = $1`,
    [user.id, tokenHash, expires]
  );

  const delivered = await deliverPasswordResetEmail(user.email, token);
  if (delivered.devResetToken) {
    return { message, devResetToken: delivered.devResetToken };
  }
  return { message };
}

export async function resetPasswordWithToken(
  tokenRaw: unknown,
  passwordRaw: unknown
): Promise<{ message: string }> {
  const token = typeof tokenRaw === "string" ? tokenRaw : "";
  const password = typeof passwordRaw === "string" ? passwordRaw : "";
  if (!token || password.length < 8) {
    throw Object.assign(new Error("token and password (min 8 chars) are required"), {
      code: "AUTH_RESET_INVALID_INPUT",
    });
  }

  const tokenHash = hashResetToken(token);
  const rows = await query<{ id: string }>(
    `SELECT id FROM users
     WHERE password_reset_token_hash = $1
       AND password_reset_expires > NOW()`,
    [tokenHash]
  );
  const user = rows[0];
  if (!user) {
    throw Object.assign(new Error("invalid or expired reset link"), {
      code: "AUTH_RESET_TOKEN_INVALID",
    });
  }

  const passwordHash = await hashPassword(password);
  await query(
    `UPDATE users SET
       password_hash = $2,
       password_reset_token_hash = NULL,
       password_reset_expires = NULL,
       updated_at = NOW()
     WHERE id = $1`,
    [user.id, passwordHash]
  );

  return { message: "password updated" };
}
