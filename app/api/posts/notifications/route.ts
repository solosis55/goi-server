import { NextResponse } from "next/server";
import { requireAuthUserId } from "@/lib/auth/requestAuth";
import { jsonError, serverError } from "@/lib/http/apiError";
import { listNotificationsForUser } from "@/lib/notifications/notificationsService";

export async function GET(request: Request) {
  const auth = requireAuthUserId(request);
  if (auth instanceof Response) return auth;

  try {
    const body = await listNotificationsForUser(auth);
    return NextResponse.json(body);
  } catch {
    return serverError("No se pudieron cargar las notificaciones");
  }
}
