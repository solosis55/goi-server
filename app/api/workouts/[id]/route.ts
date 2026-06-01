import { NextResponse } from "next/server";
import { requireAuthUserId } from "@/lib/auth/requestAuth";
import { jsonError, serverError, validationError } from "@/lib/http/apiError";
import { deleteWorkout, updateWorkout } from "@/lib/workouts/workoutsRepository";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: RouteContext) {
  const auth = requireAuthUserId(request);
  if (auth instanceof Response) return auth;

  const { id } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationError([{ message: "JSON no válido" }]);
  }

  try {
    const result = await updateWorkout(id, auth, body as Record<string, unknown>);
    if (result === "not_found") return jsonError(404, "WORKOUT_NOT_FOUND", "workout not found");
    if (result === "forbidden") return jsonError(403, "WORKOUT_FORBIDDEN", "forbidden");
    if (result === "invalid") {
      return jsonError(400, "WORKOUT_INVALID_INPUT", "invalid workout input");
    }
    return NextResponse.json(result);
  } catch {
    return serverError("No se pudo actualizar la rutina");
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = requireAuthUserId(request);
  if (auth instanceof Response) return auth;

  const { id } = await context.params;
  try {
    const result = await deleteWorkout(id, auth);
    if (result === "not_found") return jsonError(404, "WORKOUT_NOT_FOUND", "workout not found");
    if (result === "forbidden") return jsonError(403, "WORKOUT_FORBIDDEN", "forbidden");
    return NextResponse.json({ message: "workout deleted", workout: result });
  } catch {
    return serverError("No se pudo eliminar la rutina");
  }
}
