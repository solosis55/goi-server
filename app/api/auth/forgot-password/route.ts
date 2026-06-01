import { NextResponse } from "next/server";
import { requestPasswordReset } from "@/lib/auth/passwordReset";
import { jsonError, serverError } from "@/lib/http/apiError";

export async function POST(request: Request) {
  let body: { email?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "AUTH_FORGOT_PASSWORD_INVALID_INPUT", "email is required");
  }

  try {
    const result = await requestPasswordReset(body.email);
    return NextResponse.json(result);
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "AUTH_FORGOT_PASSWORD_INVALID_INPUT") {
      return jsonError(400, code, (err as Error).message);
    }
    return serverError("No se pudo procesar la solicitud");
  }
}
