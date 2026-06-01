import { NextResponse } from "next/server";
import { requireAuthUserId } from "@/lib/auth/requestAuth";
import { jsonError, serverError } from "@/lib/http/apiError";
import { getProfileStats } from "@/lib/social/profileStatsService";

type RouteContext = { params: Promise<{ userId: string }> };

/** Contadores y resumen de entreno del perfil propio. */
export async function GET(request: Request, context: RouteContext) {
  const auth = requireAuthUserId(request);
  if (auth instanceof Response) return auth;

  const { userId } = await context.params;
  if (auth !== userId) {
    return jsonError(403, "PROFILE_FORBIDDEN", "solo tu propio perfil");
  }

  try {
    const stats = await getProfileStats(userId);
    return NextResponse.json(stats);
  } catch {
    return serverError("No se pudieron cargar las estadísticas del perfil");
  }
}
