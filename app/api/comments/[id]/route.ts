import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { mapCommentRow } from "@/lib/comments/mapComment";
import { jsonError, serverError, validationError } from "@/lib/http/apiError";
import { updateCommentSchema } from "@/lib/schemas/commentSchema";
import type { CommentRow } from "@/lib/types/comment";

type RouteContext = { params: Promise<{ id: string }> };

async function findComment(id: string): Promise<CommentRow | null> {
  const rows = await query<CommentRow>(
    `SELECT id, post_id, user_id, content, created_at, updated_at
     FROM post_comments WHERE id = $1`,
    [id]
  );
  return rows[0] ?? null;
}

/** ≈ PATCH/DELETE /api/checklist-items/:itemId (NoteFlow). */
export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationError([{ message: "JSON no válido" }]);
  }

  const parsed = updateCommentSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error.flatten());
  }

  const existing = await findComment(id);
  if (!existing) {
    return jsonError(404, "COMMENT_NOT_FOUND", "El comentario no existe");
  }

  try {
    const rows = await query<CommentRow>(
      `UPDATE post_comments
       SET content = $2, updated_at = NOW()
       WHERE id = $1
       RETURNING id, post_id, user_id, content, created_at, updated_at`,
      [id, parsed.data.content]
    );
    const updated = rows[0];
    if (!updated) return jsonError(404, "COMMENT_NOT_FOUND", "El comentario no existe");
    return NextResponse.json(mapCommentRow(updated));
  } catch {
    return serverError("No se pudo actualizar el comentario");
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const rows = await query<{ id: string }>(
      `DELETE FROM post_comments WHERE id = $1 RETURNING id`,
      [id]
    );
    if (!rows[0]) {
      return jsonError(404, "COMMENT_NOT_FOUND", "El comentario no existe");
    }
    return new NextResponse(null, { status: 204 });
  } catch {
    return serverError("No se pudo eliminar el comentario");
  }
}
