import { NextResponse } from "next/server";
import { requireAuthUserId } from "@/lib/auth/requestAuth";
import { findExerciseById } from "@/lib/workouts/exercisesRepository";
import { jsonError, serverError } from "@/lib/http/apiError";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const auth = requireAuthUserId(request);
  if (auth instanceof Response) return auth;

  const { id } = await context.params;
  try {
    const exercise = await findExerciseById(id);
    if (!exercise) {
      return jsonError(404, "EXERCISE_NOT_FOUND", "exercise not found");
    }
    return NextResponse.json(exercise);
  } catch {
    return serverError("No se pudo obtener el ejercicio");
  }
}
