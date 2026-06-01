import { NextResponse } from "next/server";
import { resetPasswordWithToken } from "@/lib/auth/passwordReset";
import { jsonError, serverError } from "@/lib/http/apiError";

export async function POST(request: Request) {
  let body: { token?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "AUTH_RESET_INVALID_INPUT", "token and password (min 6 chars) are required");
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
