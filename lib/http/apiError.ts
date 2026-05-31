import { NextResponse } from "next/server";

export function jsonError(status: number, code: string, message: string) {
  return NextResponse.json({ code, message }, { status });
}

export function validationError(details: unknown) {
  return NextResponse.json(
    { code: "POST_INVALID_INPUT", message: "Datos no válidos", details },
    { status: 400 }
  );
}

export function serverError(message = "Error interno del servidor") {
  return jsonError(500, "API_ERROR", message);
}
