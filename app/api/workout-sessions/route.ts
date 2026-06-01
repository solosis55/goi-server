import { NextResponse } from "next/server";
import { requireAuthUserId } from "@/lib/auth/requestAuth";
import { jsonError, serverError, validationError } from "@/lib/http/apiError";
import { createSession, listSessionsForUser } from "@/lib/workouts/sessionsRepository";

export async function GET(request: Request) {
  const auth = requireAuthUserId(request);
  if (auth instanceof Response) return auth;

  try {
    const sessions = await listSessionsForUser(auth);
    return NextResponse.json(sessions);
  } catch {
    return serverError("No se pudieron listar las sesiones");
  }
}

export async function POST(request: Request) {
  const auth = requireAuthUserId(request);
  if (auth instanceof Response) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationError([{ message: "JSON no válido" }]);
  }

  try {
    const result = await createSession(auth, body as Record<string, unknown>);
    if (result === "workout_not_found") {
      return jsonError(404, "WORKOUT_NOT_FOUND", "workout not found");
    }
    if (result === "forbidden") {
      return jsonError(403, "WORKOUT_FORBIDDEN", "forbidden");
    }
    if (result === "invalid") {
      return jsonError(400, "WORKOUT_SESSION_INVALID_INPUT", "invalid session input");
    }
    return NextResponse.json(result, { status: 201 });
  } catch {
    return serverError("No se pudo crear la sesión");
  }
}
