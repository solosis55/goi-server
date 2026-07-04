import { NextResponse } from "next/server";
import { requireAuthUserId } from "@/lib/auth/requestAuth";
import { serverError } from "@/lib/http/apiError";
import { querySessionsForPicker } from "@/lib/workouts/sessionPickerQuery";

/** Sesiones paginadas para el compositor (búsqueda, filtros, sesiones ya publicadas). */
export async function GET(request: Request) {
  const auth = requireAuthUserId(request);
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? undefined;
  const workoutId = searchParams.get("workoutId") ?? undefined;
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  const cursor = searchParams.get("cursor") ?? undefined;
  const limitRaw = searchParams.get("limit");
  const parsedLimit = limitRaw != null ? Number.parseInt(limitRaw, 10) : undefined;
  const includeLinkedParam = searchParams.get("includeLinked");
  const includeLinked =
    includeLinkedParam === null ||
    includeLinkedParam === "1" ||
    includeLinkedParam === "true";

  try {
    const result = await querySessionsForPicker({
      userId: auth,
      q,
      workoutId,
      from,
      to,
      cursor,
      limit: Number.isFinite(parsedLimit) ? parsedLimit : undefined,
      includeLinked,
    });
    return NextResponse.json(result);
  } catch {
    return serverError("No se pudieron listar las sesiones para el selector");
  }
}
