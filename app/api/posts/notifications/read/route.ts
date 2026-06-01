import { NextResponse } from "next/server";
import { requireAuthUserId } from "@/lib/auth/requestAuth";
import { jsonError, serverError, validationError } from "@/lib/http/apiError";
import { markReadsForUser } from "@/lib/notifications/notificationsService";

type MarkReadsBody = {
  keys?: unknown;
  ids?: unknown;
  all?: unknown;
};

export async function POST(request: Request) {
  const auth = requireAuthUserId(request);
  if (auth instanceof Response) return auth;

  let body: MarkReadsBody;
  try {
    body = (await request.json()) as MarkReadsBody;
  } catch {
    return validationError([{ message: "JSON no válido" }]);
  }

  const keysFromBody = Array.isArray(body.keys)
    ? body.keys.filter((k): k is string => typeof k === "string")
    : Array.isArray(body.ids)
      ? body.ids.filter((k): k is string => typeof k === "string")
      : undefined;

  if (body.all !== true && (!keysFromBody || keysFromBody.length === 0)) {
    return jsonError(
      400,
      "NOTIFICATION_READ_INVALID_INPUT",
      "keys, ids or all is required"
    );
  }

  try {
    const result = await markReadsForUser(auth, {
      keys: keysFromBody,
      all: body.all === true,
    });
    return NextResponse.json({ ok: true, marked: result.marked });
  } catch {
    return serverError("No se pudieron marcar las notificaciones");
  }
}
