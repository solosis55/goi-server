import { passwordResetEmailContent } from "@/lib/email/authEmailBodies";
import { isDevReturnTokensEnabled } from "@/lib/email/config";
import { canSendRealEmail, sendEmail } from "@/lib/email/sendEmail";

export async function deliverPasswordResetEmail(
  email: string,
  token: string
): Promise<{ devResetToken?: string }> {
  if (canSendRealEmail()) {
    const body = passwordResetEmailContent(token);
    await sendEmail({ to: email, ...body });
    return {};
  }

  if (isDevReturnTokensEnabled()) {
    return { devResetToken: token };
  }

  console.warn("[email] Password reset skipped: configure RESEND_API_KEY or AUTH_RESET_RETURN_TOKEN=true");
  return {};
}
