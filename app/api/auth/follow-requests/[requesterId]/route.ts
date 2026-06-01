import { NextResponse } from "next/server";
import { requireAuthUserId } from "@/lib/auth/requestAuth";
import { jsonError, serverError } from "@/lib/http/apiError";
import { respondFollowRequest } from "@/lib/social/followsRepository";

type RouteContext = { params: Promise<{ requesterId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const auth = requireAuthUserId(request);
  if (auth instanceof Response) return auth;

  const { requesterId } = await context.params;

  let body: { action?: string };
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "AUTH_INVALID_INPUT", "action must be accept or reject");
  }

  const action = typeof body.action === "string" ? body.action.trim() : "";
  if (action !== "accept" && action !== "reject") {
    return jsonError(400, "AUTH_INVALID_INPUT", "action must be accept or reject");
  }

  try {
    const ok = await respondFollowRequest(auth, requesterId, action);
    if (!ok) {
      return jsonError(404, "AUTH_FOLLOW_REQUEST_NOT_FOUND", "request not found");
    }
    return NextResponse.json({ ok: true, action });
  } catch {
    return serverError("No se pudo responder la solicitud");
  }
}
