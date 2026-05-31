import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { jsonError, serverError, validationError } from "@/lib/http/apiError";
import { mapPostRow } from "@/lib/posts/mapPost";
import { updatePostSchema } from "@/lib/schemas/postSchema";
import type { PostRow } from "@/lib/types/post";

type RouteContext = { params: Promise<{ id: string }> };

const POST_SELECT = `SELECT id, user_id, content, format, visibility, session_id, created_at, updated_at`;

async function findPostById(id: string): Promise<PostRow | null> {
  const rows = await query<PostRow>(`${POST_SELECT} FROM posts WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

/** GET una publicación (≈ GET /api/notes/:id). */
export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const post = await findPostById(id);
    if (!post) {
      return jsonError(404, "POST_NOT_FOUND", "La publicación no existe");
    }
    return NextResponse.json(mapPostRow(post));
  } catch {
    return serverError("No se pudo obtener la publicación");
  }
}

/** PATCH actualización parcial (≈ PATCH /api/notes/:id). */
export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationError([{ message: "JSON no válido" }]);
  }

  const parsed = updatePostSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error.flatten());
  }

  const existing = await findPostById(id);
  if (!existing) {
    return jsonError(404, "POST_NOT_FOUND", "La publicación no existe");
  }

  const next = {
    content: parsed.data.content ?? existing.content,
    format: parsed.data.format ?? existing.format,
    visibility: parsed.data.visibility ?? existing.visibility,
    sessionId:
      parsed.data.sessionId !== undefined ? parsed.data.sessionId : existing.session_id,
  };

  try {
    const rows = await query<PostRow>(
      `UPDATE posts
       SET content = $2, format = $3, visibility = $4, session_id = $5, updated_at = NOW()
       WHERE id = $1
       RETURNING id, user_id, content, format, visibility, session_id, created_at, updated_at`,
      [id, next.content, next.format, next.visibility, next.sessionId]
    );
    const updated = rows[0];
    if (!updated) return jsonError(404, "POST_NOT_FOUND", "La publicación no existe");
    return NextResponse.json(mapPostRow(updated));
  } catch {
    return serverError("No se pudo actualizar la publicación");
  }
}

/** DELETE — 204 sin cuerpo; CASCADE borra post_comments (≈ DELETE /api/notes/:id). */
export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const rows = await query<{ id: string }>(
      `DELETE FROM posts WHERE id = $1 RETURNING id`,
      [id]
    );
    if (!rows[0]) {
      return jsonError(404, "POST_NOT_FOUND", "La publicación no existe");
    }
    return new NextResponse(null, { status: 204 });
  } catch {
    return serverError("No se pudo eliminar la publicación");
  }
}
