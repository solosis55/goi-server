import { NextResponse } from "next/server";
import { requireAuthUserId } from "@/lib/auth/requestAuth";
import { jsonError, serverError } from "@/lib/http/apiError";
import { toggleBlock } from "@/lib/social/blocksRepository";
import { findUserById } from "@/lib/users/repository";

type RouteContext = { params: Promise<{ targetUserId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const auth = requireAuthUserId(request);
  if (auth instanceof Response) return auth;

  const { targetUserId } = await context.params;
  if (auth === targetUserId) {
    return jsonError(400, "AUTH_INVALID_INPUT", "cannot block yourself");
  }

  const target = await findUserById(targetUserId);
  if (!target) {
    return jsonError(404, "AUTH_USER_NOT_FOUND", "user not found");
  }

  try {
    const result = await toggleBlock(auth, targetUserId);
    return NextResponse.json(result);
  } catch {
    return serverError("No se pudo actualizar el bloqueo");
  }
}
