import { NextResponse } from "next/server";
import { verifyEmailWithToken } from "@/lib/auth/emailVerification";
import { jsonError, serverError } from "@/lib/http/apiError";

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
