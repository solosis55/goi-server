import { NextResponse } from "next/server";
import { resetPasswordWithToken } from "@/lib/auth/passwordReset";
import { getWebAppUrl } from "@/lib/email/config";
import { jsonError, serverError } from "@/lib/http/apiError";

function redirectToWebReset(token: string) {
  const base = getWebAppUrl();
  return NextResponse.redirect(`${base}/?reset=${encodeURIComponent(token)}`, 302);
}

/** Enlace del correo: redirige a la web con ?reset= para elegir contraseña nueva. */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token")?.trim();
  if (!token) {
    return NextResponse.redirect(getWebAppUrl(), 302);
  }
  return redirectToWebReset(token);
}

export async function POST(request: Request) {
  let body: { token?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "AUTH_RESET_INVALID_INPUT", "token and password (min 8 chars) are required");
  }

  try {
    const result = await resetPasswordWithToken(body.token, body.password);
    return NextResponse.json(result);
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "AUTH_RESET_INVALID_INPUT" || code === "AUTH_RESET_TOKEN_INVALID") {
      return jsonError(400, code, (err as Error).message);
    }
    return serverError("No se pudo restablecer la contraseña");
  }
}
