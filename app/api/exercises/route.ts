import { NextResponse } from "next/server";
import { requireAuthUserId } from "@/lib/auth/requestAuth";
import { listExercises } from "@/lib/workouts/exercisesRepository";
import { serverError } from "@/lib/http/apiError";

export async function GET(request: Request) {
  const auth = requireAuthUserId(request);
  if (auth instanceof Response) return auth;

  try {
    const exercises = await listExercises();
    return NextResponse.json(exercises);
  } catch {
    return serverError("No se pudo listar el catálogo de ejercicios");
  }
}
