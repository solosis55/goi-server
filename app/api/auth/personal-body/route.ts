import { NextResponse } from "next/server";
import { requireAuthUserId } from "@/lib/auth/requestAuth";
import { jsonError } from "@/lib/http/apiError";
import {
  readPersonalBodyEnvelopeRaw,
  writePersonalBodyEnvelopeRaw,
} from "@/lib/personal/personalBodyFile";

const MAX_ENVELOPE_CHARS = 14_000_000;

function parseEnvelope(raw: string) {
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    if (typeof o.serverWrittenAt !== "string") return null;
    if (Number.isNaN(Date.parse(o.serverWrittenAt))) return null;
    return { serverWrittenAt: o.serverWrittenAt, bundle: o.bundle };
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const auth = requireAuthUserId(request);
  if (auth instanceof Response) return auth;

  const raw = readPersonalBodyEnvelopeRaw(auth);
  if (!raw) {
    return NextResponse.json({ serverWrittenAt: null, bundle: null });
  }
  const env = parseEnvelope(raw);
  if (!env) {
    return jsonError(500, "PERSONAL_BODY_CORRUPT", "No se pudo leer el archivo de datos personales.");
  }
  return NextResponse.json({ serverWrittenAt: env.serverWrittenAt, bundle: env.bundle });
}

export async function PUT(request: Request) {
  const auth = requireAuthUserId(request);
  if (auth instanceof Response) return auth;

  let body: { bundle?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "PERSONAL_BODY_INVALID", "El cuerpo debe ser JSON con { bundle: { ... } }.");
  }

  const bundle = body.bundle;
  if (bundle === undefined || bundle === null || typeof bundle !== "object") {
    return jsonError(400, "PERSONAL_BODY_INVALID", "El cuerpo debe ser JSON con { bundle: { ... } }.");
  }

  const serverWrittenAt = new Date().toISOString();
  const envelope = JSON.stringify({ serverWrittenAt, bundle });

  if (envelope.length > MAX_ENVELOPE_CHARS) {
    return jsonError(
      413,
      "PERSONAL_BODY_TOO_LARGE",
      "Los datos superan el tamaño máximo permitido (reduce fotos o historial)."
    );
  }

  try {
    writePersonalBodyEnvelopeRaw(auth, envelope);
    return NextResponse.json({ ok: true, serverWrittenAt });
  } catch {
    return jsonError(500, "PERSONAL_BODY_WRITE_FAILED", "No se pudo guardar en disco.");
  }
}
