import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { jsonError, serverError } from "@/lib/http/apiError";
import { parsePostMedia } from "@/lib/posts/mapPost";

type RouteContext = { params: Promise<{ id: string }> };

/** Solo adjuntos (sin comentarios) — hidratación del feed en móvil. */
export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const rows = await query<{ media: unknown }>(`SELECT media FROM posts WHERE id = $1`, [id]);
    if (!rows[0]) {
      return jsonError(404, "POST_NOT_FOUND", "La publicación no existe");
    }
    const media = parsePostMedia(rows[0].media) ?? [];
    return NextResponse.json({ media });
  } catch {
    return serverError("No se pudieron cargar las imágenes");
  }
}
