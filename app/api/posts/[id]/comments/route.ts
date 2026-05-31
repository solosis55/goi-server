import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { mapCommentRow } from "@/lib/comments/mapComment";
import { listCommentsForPost, postExists } from "@/lib/posts/listPostsWithRelations";
import { jsonError, serverError, validationError } from "@/lib/http/apiError";
import { createCommentSchema } from "@/lib/schemas/commentSchema";
import type { CommentRow } from "@/lib/types/comment";

type RouteContext = { params: Promise<{ id: string }> };

/** ≈ GET/POST /api/notes/:id/checklist-items (NoteFlow) → comentarios de un post. */
export async function GET(_request: Request, context: RouteContext) {
  const { id: postId } = await context.params;
  try {
    if (!(await postExists(postId))) {
      return jsonError(404, "POST_NOT_FOUND", "La publicación no existe");
    }
    const comments = await listCommentsForPost(postId);
    return NextResponse.json(comments);
  } catch {
    return serverError("No se pudieron listar los comentarios");
  }
}

export async function POST(request: Request, context: RouteContext) {
  const { id: postId } = await context.params;

  if (!(await postExists(postId))) {
    return jsonError(404, "POST_NOT_FOUND", "La publicación no existe");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationError([{ message: "JSON no válido" }]);
  }

  const parsed = createCommentSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error.flatten());
  }

  const { userId, content } = parsed.data;

  try {
    const rows = await query<CommentRow>(
      `INSERT INTO post_comments (post_id, user_id, content)
       VALUES ($1, $2, $3)
       RETURNING id, post_id, user_id, content, created_at, updated_at`,
      [postId, userId, content]
    );
    const created = rows[0];
    if (!created) return serverError("No se pudo crear el comentario");
    return NextResponse.json(mapCommentRow(created), { status: 201 });
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "23503") {
      return NextResponse.json(
        { code: "COMMENT_INVALID_INPUT", message: "El usuario (userId) no existe" },
        { status: 400 }
      );
    }
    return serverError("No se pudo crear el comentario");
  }
}
