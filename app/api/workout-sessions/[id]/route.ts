import { NextResponse } from "next/server";
import { requireAuthUserId } from "@/lib/auth/requestAuth";
import { jsonError, serverError } from "@/lib/http/apiError";
import {
  canViewSession,
  deleteSession,
  getSessionById,
} from "@/lib/workouts/sessionsRepository";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const auth = requireAuthUserId(request);
  if (auth instanceof Response) return auth;

  const { id } = await context.params;
  try {
    const session = await getSessionById(id);
    if (!session) {
      return jsonError(404, "WORKOUT_SESSION_NOT_FOUND", "session not found");
    }
    if (!(await canViewSession(session, auth))) {
      return jsonError(403, "WORKOUT_SESSION_FORBIDDEN", "forbidden");
    }
    return NextResponse.json(session);
  } catch {
    return serverError("No se pudo obtener la sesión");
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = requireAuthUserId(request);
  if (auth instanceof Response) return auth;

  const { id } = await context.params;
  try {
    const result = await deleteSession(id, auth);
    if (result === "not_found") {
      return jsonError(404, "WORKOUT_SESSION_NOT_FOUND", "session not found");
    }
    if (result === "forbidden") {
      return jsonError(403, "WORKOUT_SESSION_FORBIDDEN", "forbidden");
    }
    return NextResponse.json({ message: "session deleted", session: result });
  } catch {
    return serverError("No se pudo eliminar la sesión");
  }
}
