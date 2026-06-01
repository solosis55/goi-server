import { NextResponse } from "next/server";
import { requireAuthUserId } from "@/lib/auth/requestAuth";
import { jsonError, serverError } from "@/lib/http/apiError";
import { listProfileSocialPage } from "@/lib/social/publicProfileService";

type RouteContext = { params: Promise<{ userId: string; kind: string }> };

export async function GET(request: Request, context: RouteContext) {
  const auth = requireAuthUserId(request);
  if (auth instanceof Response) return auth;

  const { userId, kind } = await context.params;
  if (kind !== "followers" && kind !== "following") {
    return jsonError(400, "PROFILE_INVALID_INPUT", "kind must be followers or following");
  }

  const url = new URL(request.url);
  const limitRaw = Number(url.searchParams.get("limit"));
  let limit = Number.isFinite(limitRaw) ? limitRaw : 30;
  limit = Math.min(50, Math.max(1, limit));
  const cursor = url.searchParams.get("cursor")?.trim() || undefined;

  try {
    const page = await listProfileSocialPage(auth, userId, kind, { limit, cursor });
    if (!page) {
      return jsonError(404, "AUTH_USER_NOT_FOUND", "user not found");
    }
    return NextResponse.json(page);
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "PROFILE_FORBIDDEN") {
      return jsonError(403, code, (err as Error).message);
    }
    return serverError("No se pudo cargar la lista social");
  }
}
