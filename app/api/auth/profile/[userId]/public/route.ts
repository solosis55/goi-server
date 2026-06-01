import { NextResponse } from "next/server";
import { requireAuthUserId } from "@/lib/auth/requestAuth";
import { jsonError, serverError } from "@/lib/http/apiError";
import { getPublicProfileOverview } from "@/lib/social/publicProfileService";

type RouteContext = { params: Promise<{ userId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const auth = requireAuthUserId(request);
  if (auth instanceof Response) return auth;

  const { userId } = await context.params;

  try {
    const overview = await getPublicProfileOverview(auth, userId);
    if (!overview) {
      return jsonError(404, "AUTH_USER_NOT_FOUND", "user not found");
    }
    return NextResponse.json(overview);
  } catch {
    return serverError("No se pudo cargar el perfil público");
  }
}
