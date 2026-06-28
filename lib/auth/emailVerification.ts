import { createHash, randomBytes } from "node:crypto";
import { query } from "@/lib/db";
import {
  emailVerificationEmailContent,
  passwordResetEmailContent,
} from "@/lib/email/authEmailBodies";
import { isDevReturnTokensEnabled } from "@/lib/email/config";
import { canSendRealEmail, sendEmail } from "@/lib/email/sendEmail";
import { findUserByEmail, findUserById } from "@/lib/users/repository";

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;

export function hashVerificationToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

async function persistVerificationToken(userId: string, token: string): Promise<void> {
  const tokenHash = hashVerificationToken(token);
  const expires = new Date(Date.now() + VERIFY_TTL_MS).toISOString();
  await query(
    `UPDATE users SET
       email_verification_token_hash = $2,
       email_verification_expires = $3::timestamptz,
       updated_at = NOW()
     WHERE id = $1`,
    [userId, tokenHash, expires]
  );
}

export async function sendVerificationEmailForUser(
  userId: string,
  email: string
): Promise<{ devVerificationToken?: string }> {
  const token = randomBytes(32).toString("hex");
  await persistVerificationToken(userId, token);

  if (canSendRealEmail()) {
    const body = emailVerificationEmailContent(token);
    await sendEmail({ to: email, ...body });
    return {};
  }

  if (isDevReturnTokensEnabled()) {
    return { devVerificationToken: token };
  }

  console.warn("[email] Verification skipped: configure RESEND_API_KEY or AUTH_RESET_RETURN_TOKEN=true");
  return {};
}

export async function verifyEmailWithToken(tokenRaw: unknown): Promise<{ message: string }> {
  const token = typeof tokenRaw === "string" ? tokenRaw.trim() : "";
  if (!token) {
    throw Object.assign(new Error("token is required"), { code: "AUTH_VERIFY_INVALID_INPUT" });
  }

  const tokenHash = hashVerificationToken(token);
  const rows = await query<{ id: string }>(
    `SELECT id FROM users
     WHERE email_verification_token_hash = $1
       AND email_verification_expires > NOW()`,
    [tokenHash]
  );
  const user = rows[0];
  if (!user) {
    throw Object.assign(new Error("invalid or expired verification link"), {
      code: "AUTH_VERIFY_TOKEN_INVALID",
    });
  }

  await query(
    `UPDATE users SET
       email_verified = TRUE,
       email_verification_token_hash = NULL,
       email_verification_expires = NULL,
       updated_at = NOW()
     WHERE id = $1`,
    [user.id]
  );

  return { message: "email verified" };
}

export async function resendVerificationEmail(emailRaw: unknown): Promise<{
  message: string;
  devVerificationToken?: string;
}> {
  const normalizedEmail =
    typeof emailRaw === "string" ? emailRaw.trim().toLowerCase() : "";
  const message =
    "Si el correo está registrado y aún no verificado, enviaremos un nuevo enlace (revisa también spam).";

  if (!normalizedEmail) {
    throw Object.assign(new Error("email is required"), { code: "AUTH_VERIFY_INVALID_INPUT" });
  }

  const user = await findUserByEmail(normalizedEmail);
  if (!user || user.email_verified) {
    return { message };
  }

  const extra = await sendVerificationEmailForUser(user.id, user.email);
  return { message, ...extra };
}

export async function isUserEmailVerified(userId: string): Promise<boolean> {
  const user = await findUserById(userId);
  return Boolean(user?.email_verified);
}
