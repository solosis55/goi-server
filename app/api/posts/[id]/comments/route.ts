import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { mapCommentRow } from "@/lib/comments/mapComment";
import { mapCommentJson } from "@/lib/posts/mapPostForClient";
import { listCommentsForPost, postExists } from "@/lib/posts/listPostsWithRelations";
import { jsonError, serverError, validationError } from "@/lib/http/apiError";
import { createCommentSchema } from "@/lib/schemas/commentSchema";
import { ensureAppUser } from "@/lib/users/ensureAppUser";
import type { CommentRow } from "@/lib/types/comment";

type RouteContext = { params: Promise<{ id: string }> };

/** GET/POST comentarios de un post. */
export async function GET(_request: Request, context: RouteContext) {
  const { id: postId } = await context.params;
  try {
    if (!(await postExists(postId))) {
      return jsonError(404, "POST_NOT_FOUND", "La publicación no existe");
    }
    const rows = await query<
      CommentRow & { author_username: string; author_avatar_url: string }
    >(
      `SELECT pc.id, pc.post_id, pc.user_id, pc.content, pc.created_at, pc.updated_at,
              u.username AS author_username, u.avatar_url AS author_avatar_url
       FROM post_comments pc
       INNER JOIN users u ON u.id = pc.user_id
       WHERE pc.post_id = $1
       ORDER BY pc.created_at ASC`,
      [postId]
    );
    const comments = rows.map((row) =>
      mapCommentJson({
        id: row.id,
        post_id: row.post_id,
        user_id: row.user_id,
        content: row.content,
        created_at: row.created_at,
        updated_at: row.updated_at,
        author_username: row.author_username,
        author_avatar_url: row.author_avatar_url,
      })
    );
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

  const { userId, content, username, avatarUrl } = parsed.data;

  try {
    if (username) {
      await ensureAppUser({ id: userId, username, avatarUrl });
    }

    const rows = await query<CommentRow>(
      `INSERT INTO post_comments (post_id, user_id, content)
       VALUES ($1, $2, $3)
       RETURNING id, post_id, user_id, content, created_at, updated_at`,
      [postId, userId, content]
    );
    const created = rows[0];
    if (!created) return serverError("No se pudo crear el comentario");

    const authorRows = await query<{ username: string; avatar_url: string }>(
      `SELECT username, avatar_url FROM users WHERE id = $1`,
      [userId]
    );
    const author = authorRows[0];

    return NextResponse.json(
      mapCommentJson({
        id: created.id,
        post_id: created.post_id,
        user_id: created.user_id,
        content: created.content,
        created_at: created.created_at,
        updated_at: created.updated_at,
        author_username: author?.username ?? username ?? "Usuario",
        author_avatar_url: author?.avatar_url ?? avatarUrl ?? "",
      }),
      { status: 201 }
    );
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "23503") {
      return NextResponse.json(
        { code: "COMMENT_INVALID_INPUT", message: "El usuario (userId) no existe. Envía username para sincronizar." },
        { status: 400 }
      );
    }
    return serverError("No se pudo crear el comentario");
  }
}
