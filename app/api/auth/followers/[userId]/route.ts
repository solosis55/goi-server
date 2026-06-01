import { NextResponse } from "next/server";
import { requireAuthUserId } from "@/lib/auth/requestAuth";
import { jsonError, serverError } from "@/lib/http/apiError";
import { getFollowerIds } from "@/lib/social/followsRepository";
import { canViewFullProfile } from "@/lib/social/profileAccess";
import { findUserById } from "@/lib/users/repository";

type RouteContext = { params: Promise<{ userId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const auth = requireAuthUserId(request);
  if (auth instanceof Response) return auth;

  const { userId } = await context.params;
  const target = await findUserById(userId);
  if (!target) {
    return jsonError(404, "AUTH_USER_NOT_FOUND", "user not found");
  }

  if (auth !== userId) {
    const canView = await canViewFullProfile(auth, userId, target.profile_visibility ?? "public");
    if (!canView) {
      return jsonError(403, "AUTH_FORBIDDEN", "forbidden");
    }
  }

  try {
    const followerIds = await getFollowerIds(userId);
    return NextResponse.json({ followerIds });
  } catch {
    return serverError("No se pudo listar seguidores");
  }
}
