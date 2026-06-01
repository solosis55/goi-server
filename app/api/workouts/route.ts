import { NextResponse } from "next/server";
import { requireAuthUserId } from "@/lib/auth/requestAuth";
import { jsonError, serverError, validationError } from "@/lib/http/apiError";
import { createWorkout, listWorkouts } from "@/lib/workouts/workoutsRepository";

export async function GET() {
  try {
    const workouts = await listWorkouts();
    return NextResponse.json(workouts);
  } catch {
    return serverError("No se pudieron listar las rutinas");
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
    const result = await createWorkout(auth, body as Record<string, unknown>);
    if (result === "invalid") {
      return jsonError(400, "WORKOUT_INVALID_INPUT", "invalid workout input");
    }
    return NextResponse.json(result, { status: 201 });
  } catch {
    return serverError("No se pudo crear la rutina");
  }
}
