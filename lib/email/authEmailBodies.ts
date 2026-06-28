import { getWebAppUrl } from "@/lib/email/config";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildPasswordResetLinks(token: string) {
  const web = `${getWebAppUrl()}/?reset=${encodeURIComponent(token)}`;
  const app = `goi://reset-password?token=${encodeURIComponent(token)}`;
  return { web, app };
}

export function buildEmailVerificationLinks(token: string) {
  const web = `${getWebAppUrl()}/?verify=${encodeURIComponent(token)}`;
  const app = `goi://verify-email?token=${encodeURIComponent(token)}`;
  return { web, app };
}

export function passwordResetEmailContent(token: string) {
  const { web, app } = buildPasswordResetLinks(token);
  const subject = "Restablece tu contraseña en Goi";
  const text = [
    "Has solicitado restablecer tu contraseña en Goi.",
    "",
    `Web: ${web}`,
    `App: ${app}`,
    "",
    "El enlace caduca en 1 hora. Si no fuiste tú, ignora este correo.",
  ].join("\n");
  const html = `
    <p>Has solicitado restablecer tu contraseña en <strong>Goi</strong>.</p>
    <p><a href="${escapeHtml(web)}">Abrir en la web</a></p>
    <p><a href="${escapeHtml(app)}">Abrir en la app</a></p>
    <p style="color:#666;font-size:13px;">El enlace caduca en 1 hora.</p>
  `.trim();
  return { subject, html, text };
}

export function emailVerificationEmailContent(token: string) {
  const { web, app } = buildEmailVerificationLinks(token);
  const subject = "Confirma tu email en Goi";
  const text = [
    "Gracias por registrarte en Goi.",
    "",
    "Confirma tu correo para activar tu cuenta:",
    "",
    `Web: ${web}`,
    `App: ${app}`,
    "",
    "El enlace caduca en 24 horas.",
  ].join("\n");
  const html = `
    <p>Gracias por registrarte en <strong>Goi</strong>.</p>
    <p>Confirma tu correo para activar tu cuenta:</p>
    <p><a href="${escapeHtml(web)}">Confirmar en la web</a></p>
    <p><a href="${escapeHtml(app)}">Confirmar en la app</a></p>
    <p style="color:#666;font-size:13px;">El enlace caduca en 24 horas.</p>
  `.trim();
  return { subject, html, text };
}
