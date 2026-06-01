import { NextResponse } from "next/server";
import { requireAuthUserId } from "@/lib/auth/requestAuth";
import { jsonError, serverError } from "@/lib/http/apiError";
import { isBlockedBetween } from "@/lib/social/blocksRepository";
import { toggleFollow } from "@/lib/social/followsRepository";
import { findUserById } from "@/lib/users/repository";

type RouteContext = { params: Promise<{ targetUserId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const auth = requireAuthUserId(request);
  if (auth instanceof Response) return auth;

  const { targetUserId } = await context.params;
  if (auth === targetUserId) {
    return jsonError(400, "AUTH_CANNOT_FOLLOW_SELF", "cannot follow yourself");
  }

  const follower = await findUserById(auth);
  const target = await findUserById(targetUserId);
  if (!follower || !target) {
    return jsonError(404, "AUTH_USER_NOT_FOUND", "user not found");
  }

  if (target.profile_visibility === "private") {
    return jsonError(403, "AUTH_CANNOT_FOLLOW_PRIVATE", "profile is private");
  }

  if (await isBlockedBetween(auth, targetUserId)) {
    return jsonError(403, "AUTH_FORBIDDEN", "cannot follow this user");
  }

  try {
    const result = await toggleFollow(auth, targetUserId, target.profile_visibility ?? "public");
    return NextResponse.json(result);
  } catch {
    return serverError("No se pudo actualizar el seguimiento");
  }
}
