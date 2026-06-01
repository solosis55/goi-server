import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAuthUserIdFromRequest } from "@/lib/auth/requestAuth";
import { jsonError, serverError } from "@/lib/http/apiError";
import { buildActiveFollowingSet, canViewerAccessPost } from "@/lib/posts/canViewPost";
import { parsePostMedia } from "@/lib/posts/mapPost";
import { readPostMediaBytes } from "@/lib/posts/postMediaBytes";

type RouteContext = { params: Promise<{ id: string; index: string }> };

/** Imagen binaria para el feed móvil (evita data URLs enormes en RN). */
export async function GET(request: Request, context: RouteContext) {
  const { id, index: indexRaw } = await context.params;
  const index = Number(indexRaw);
  if (!Number.isInteger(index) || index < 0) {
    return jsonError(400, "INVALID_INDEX", "Índice de imagen no válido");
  }

  try {
    const rows = await query<{
      user_id: string;
      visibility: "public" | "followers" | "private";
      media: unknown;
    }>(`SELECT user_id, visibility, media FROM posts WHERE id = $1`, [id]);

    const row = rows[0];
    if (!row) {
      return jsonError(404, "POST_NOT_FOUND", "La publicación no existe");
    }

    const viewerUserId = getAuthUserIdFromRequest(request);
    const following = await buildActiveFollowingSet(viewerUserId);
    if (
      !canViewerAccessPost(
        { userId: row.user_id, visibility: row.visibility },
        viewerUserId,
        following
      )
    ) {
      return jsonError(403, "FORBIDDEN", "No puedes ver esta publicación");
    }

    const items = parsePostMedia(row.media);
    const item = items?.[index];
    if (!item?.url) {
      return jsonError(404, "MEDIA_NOT_FOUND", "Imagen no encontrada");
    }

    const bytes = await readPostMediaBytes(item.url);
    if (!bytes) {
      return jsonError(404, "MEDIA_NOT_FOUND", "No se pudo leer la imagen");
    }

    return new NextResponse(Buffer.from(bytes.data), {
      headers: {
        "Content-Type": bytes.contentType,
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch {
    return serverError("No se pudo servir la imagen");
  }
}
