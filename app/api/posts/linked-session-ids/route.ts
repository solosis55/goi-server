import { NextResponse } from "next/server";
import { requireAuthUserId } from "@/lib/auth/requestAuth";
import { serverError } from "@/lib/http/apiError";
import { listLinkedSessionIdsForUser } from "@/lib/posts/postsByIds";

/** Sesiones ya vinculadas a publicaciones del usuario autenticado. */
export async function GET(request: Request) {
  const auth = requireAuthUserId(request);
  if (auth instanceof Response) return auth;

  try {
    const sessionIds = await listLinkedSessionIdsForUser(auth);
    return NextResponse.json({ sessionIds });
  } catch {
    return serverError("No se pudieron listar las sesiones vinculadas");
  }
}
