import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { serverError, validationError } from "@/lib/http/apiError";
import { getPostForClient, listPostsForClient } from "@/lib/posts/listPostsWithRelations";
import { mapPostForClient } from "@/lib/posts/mapPostForClient";
import { mapPostRow } from "@/lib/posts/mapPost";
import { createPostSchema } from "@/lib/schemas/postSchema";
import { ensureAppUser } from "@/lib/users/ensureAppUser";
import type { PostRow } from "@/lib/types/post";

/** GET con autor + comentarios. POST crea publicación. */
export async function GET() {
  try {
    const posts = await listPostsForClient();
    return NextResponse.json(posts);
  } catch {
    return serverError("No se pudieron listar las publicaciones");
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationError([{ message: "JSON no válido" }]);
  }

  const parsed = createPostSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error.flatten());
  }

  const { userId, content, format, visibility, sessionId, username, avatarUrl } = parsed.data;

  try {
    if (username) {
      await ensureAppUser({ id: userId, username, avatarUrl });
    }

    const rows = await query<PostRow>(
      `INSERT INTO posts (user_id, content, format, visibility, session_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, user_id, content, format, visibility, session_id, created_at, updated_at`,
      [userId, content, format, visibility, sessionId ?? null]
    );
    const created = rows[0];
    if (!created) return serverError("No se pudo crear la publicación");

    const enriched = await getPostForClient(created.id);
    if (enriched) {
      return NextResponse.json(enriched, { status: 201 });
    }

    return NextResponse.json(
      mapPostForClient(mapPostRow(created), {
        authorUsername: username ?? "Usuario",
        authorAvatarUrl: avatarUrl ?? "",
        comments: [],
      }),
      { status: 201 }
    );
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "23503") {
      return NextResponse.json(
        { code: "POST_INVALID_INPUT", message: "El usuario (userId) no existe. Envía username para sincronizar." },
        { status: 400 }
      );
    }
    return serverError("No se pudo crear la publicación");
  }
}
