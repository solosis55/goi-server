function trimEnv(key: string): string {
  return process.env[key]?.trim() ?? "";
}

export function getEmailFrom(): string {
  return trimEnv("EMAIL_FROM") || "Goi <onboarding@resend.dev>";
}

export function getWebAppUrl(): string {
  const url = trimEnv("WEB_APP_URL") || "http://localhost:5173";
  return url.replace(/\/$/, "");
}

export function getPublicApiUrl(): string {
  const url = trimEnv("GOI_PUBLIC_API_URL") || "https://goi-server.onrender.com/api";
  return url.replace(/\/$/, "");
}

export function getContactEmail(): string {
  return trimEnv("CONTACT_EMAIL") || "support@example.com";
}

export function isResendConfigured(): boolean {
  return Boolean(trimEnv("RESEND_API_KEY"));
}

export function isDevReturnTokensEnabled(): boolean {
  return process.env.AUTH_RESET_RETURN_TOKEN === "true";
}
