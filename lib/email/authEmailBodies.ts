import { getWebAppUrl, getPublicApiUrl } from "@/lib/email/config";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildPasswordResetLinks(token: string) {
  const api = `${getPublicApiUrl()}/auth/reset-password?token=${encodeURIComponent(token)}`;
  const web = `${getWebAppUrl()}/?reset=${encodeURIComponent(token)}`;
  const app = `goi://reset-password?token=${encodeURIComponent(token)}`;
  return { api, web, app };
}

export function buildEmailVerificationLinks(token: string) {
  const api = `${getPublicApiUrl()}/auth/verify-email?token=${encodeURIComponent(token)}`;
  const web = `${getWebAppUrl()}/?verify=${encodeURIComponent(token)}`;
  const app = `goi://verify-email?token=${encodeURIComponent(token)}`;
  return { api, web, app };
}

/** Botón CTA compatible con Outlook/Hotmail (evita esquemas custom en href). */
function primaryButtonHtml(href: string, label: string): string {
  const safeHref = escapeHtml(href);
  const safeLabel = escapeHtml(label);
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:20px 0;">
      <tr>
        <td style="border-radius:8px;background:#c9a227;">
          <a href="${safeHref}" target="_blank" rel="noopener noreferrer"
             style="display:inline-block;padding:14px 28px;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;color:#1a1a1a;text-decoration:none;border-radius:8px;">
            ${safeLabel}
          </a>
        </td>
      </tr>
    </table>
  `.trim();
}

export function passwordResetEmailContent(token: string) {
  const { api, app } = buildPasswordResetLinks(token);
  const subject = "Restablece tu contraseña en Goi";
  const text = [
    "Has solicitado restablecer tu contraseña en Goi.",
    "",
    "Abre este enlace para elegir una contraseña nueva:",
    api,
    "",
    "En la app Goi: " + app,
    "",
    "El enlace caduca en 1 hora. Si no fuiste tú, ignora este correo.",
  ].join("\n");
  const html = `
    <div style="font-family:Arial,sans-serif;color:#222;line-height:1.5;max-width:520px;">
      <p>Has solicitado restablecer tu contraseña en <strong>Goi</strong>.</p>
      ${primaryButtonHtml(api, "Restablecer contraseña")}
      <p style="color:#666;font-size:13px;">El enlace caduca en 1 hora. Si no fuiste tú, ignora este correo.</p>
      <p style="color:#888;font-size:12px;word-break:break-all;">Enlace directo: ${escapeHtml(api)}</p>
      <p style="color:#888;font-size:12px;">Si ya tienes la app: ${escapeHtml(app)}</p>
    </div>
  `.trim();
  return { subject, html, text };
}

export function emailVerificationEmailContent(token: string) {
  const { api, app } = buildEmailVerificationLinks(token);
  const subject = "Confirma tu email en Goi";
  const text = [
    "Gracias por registrarte en Goi.",
    "",
    "Confirma tu correo para activar tu cuenta (abre este enlace):",
    api,
    "",
    "En la app Goi: " + app,
    "",
    "El enlace caduca en 24 horas.",
  ].join("\n");
  const html = `
    <div style="font-family:Arial,sans-serif;color:#222;line-height:1.5;max-width:520px;">
      <p>Gracias por registrarte en <strong>Goi</strong>.</p>
      <p>Confirma tu correo para activar tu cuenta:</p>
      ${primaryButtonHtml(api, "Confirmar mi email")}
      <p style="color:#666;font-size:13px;">El enlace caduca en 24 horas.</p>
      <p style="color:#888;font-size:12px;word-break:break-all;">Enlace directo: ${escapeHtml(api)}</p>
      <p style="color:#888;font-size:12px;">Si ya tienes la app: ${escapeHtml(app)}</p>
    </div>
  `.trim();
  return { subject, html, text };
}
