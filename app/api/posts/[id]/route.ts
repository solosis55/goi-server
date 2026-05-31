import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { jsonError, serverError, validationError } from "@/lib/http/apiError";
import { getPostForClient } from "@/lib/posts/listPostsWithRelations";
import { mapPostRow } from "@/lib/posts/mapPost";
import { updatePostSchema } from "@/lib/schemas/postSchema";
import type { PostRow } from "@/lib/types/post";

type RouteContext = { params: Promise<{ id: string }> };

const POST_SELECT = `SELECT id, user_id, content, format, visibility, session_id, created_at, updated_at`;

async function findPostById(id: string): Promise<PostRow | null> {
  const rows = await query<PostRow>(`${POST_SELECT} FROM posts WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

async function updatePostById(id: string, body: unknown) {
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

    const enriched = await getPostForClient(updated.id);
    return NextResponse.json(enriched ?? mapPostRow(updated));
  } catch {
    return serverError("No se pudo actualizar la publicación");
  }
}

/** GET una publicación con autor y comentarios. */
export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const post = await getPostForClient(id);
    if (!post) {
      return jsonError(404, "POST_NOT_FOUND", "La publicación no existe");
    }
    return NextResponse.json(post);
  } catch {
    return serverError("No se pudo obtener la publicación");
  }
}

/** PATCH actualización parcial. */
export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationError([{ message: "JSON no válido" }]);
  }
  return updatePostById(id, body);
}

/** Alias PUT para Goi App (`updatePost` usa PUT). */
export async function PUT(request: Request, context: RouteContext) {
  const { id } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationError([{ message: "JSON no válido" }]);
  }
  return updatePostById(id, body);
}

/** DELETE — 204 sin cuerpo. */
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
