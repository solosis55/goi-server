import { NextResponse } from "next/server";
import { requireAuthUserId } from "@/lib/auth/requestAuth";
import { jsonError, serverError } from "@/lib/http/apiError";
import {
  findUserById,
  getNotificationPrefs,
  updateNotificationPrefs,
  type NotificationPrefs,
} from "@/lib/users/repository";

const VALID_MUTED = new Set(["like", "comment", "follow"]);

export async function GET(request: Request) {
  const auth = requireAuthUserId(request);
  if (auth instanceof Response) return auth;

  const user = await findUserById(auth);
  if (!user) {
    return jsonError(404, "AUTH_USER_NOT_FOUND", "user not found");
  }

  const prefs = (await getNotificationPrefs(auth)) ?? { mutedTypes: [] };
  return NextResponse.json({ prefs });
}

export async function PUT(request: Request) {
  const auth = requireAuthUserId(request);
  if (auth instanceof Response) return auth;

  const user = await findUserById(auth);
  if (!user) {
    return jsonError(404, "AUTH_USER_NOT_FOUND", "user not found");
  }

  let body: { mutedTypes?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "AUTH_INVALID_INPUT", "invalid body");
  }

  const mutedRaw = body.mutedTypes;
  const mutedTypes = Array.isArray(mutedRaw)
    ? mutedRaw.filter((t): t is "like" | "comment" | "follow" => VALID_MUTED.has(String(t)))
    : [];

  const prefs: NotificationPrefs = { mutedTypes };

  try {
    const updated = await updateNotificationPrefs(auth, prefs);
    return NextResponse.json({ prefs: updated ?? prefs });
  } catch {
    return serverError("No se pudieron guardar las preferencias");
  }
}
