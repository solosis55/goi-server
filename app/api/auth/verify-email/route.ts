import { NextResponse } from "next/server";
import { verifyEmailWithToken } from "@/lib/auth/emailVerification";
import { getWebAppUrl } from "@/lib/email/config";
import { jsonError, serverError } from "@/lib/http/apiError";

function redirectToWeb(outcome: "verified" | "error") {
  const base = getWebAppUrl();
  const param = outcome === "verified" ? "verified=1" : "verifyError=1";
  return NextResponse.redirect(`${base}/?${param}`, 302);
}

/** Enlace del correo: verifica y redirige a la web (funciona sin JS en el cliente). */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  try {
    await verifyEmailWithToken(token);
    return redirectToWeb("verified");
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "AUTH_VERIFY_INVALID_INPUT" || code === "AUTH_VERIFY_TOKEN_INVALID") {
      return redirectToWeb("error");
    }
    console.error("[verify-email GET]", err);
    return redirectToWeb("error");
  }
}

export async function POST(request: Request) {
  let body: { token?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "AUTH_VERIFY_INVALID_INPUT", "token is required");
  }

  try {
    const result = await verifyEmailWithToken(body.token);
    return NextResponse.json(result);
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "AUTH_VERIFY_INVALID_INPUT") {
      return jsonError(400, code, (err as Error).message);
    }
    if (code === "AUTH_VERIFY_TOKEN_INVALID") {
      return jsonError(400, code, (err as Error).message);
    }
    return serverError("No se pudo verificar el email");
  }
}
