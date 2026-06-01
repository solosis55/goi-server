import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAuthUserIdFromRequest, requireAuthUserId } from "@/lib/auth/requestAuth";
import { serverError, validationError } from "@/lib/http/apiError";
import { getPostForClient, listPostsForClient } from "@/lib/posts/listPostsWithRelations";
import { mapPostForClient } from "@/lib/posts/mapPostForClient";
import { mapPostRow } from "@/lib/posts/mapPost";
import { normalizePostMediaFromRequest } from "@/lib/media/postMedia";
import { persistPostMediaItems } from "@/lib/uploads/postMediaStorage";
import { createPostSchema } from "@/lib/schemas/postSchema";
import { findUserById } from "@/lib/users/repository";
import type { PostRow } from "@/lib/types/post";

/** GET con autor + comentarios + likes. POST crea publicación (JWT). */
export async function GET(request: Request) {
  try {
    const viewerUserId = getAuthUserIdFromRequest(request);
    const posts = await listPostsForClient(viewerUserId);
    return NextResponse.json(posts);
  } catch {
    return serverError("No se pudieron listar las publicaciones");
  }
}

export async function POST(request: Request) {
  const auth = requireAuthUserId(request);
  if (auth instanceof Response) return auth;
  const userId = auth;

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

  const { content, format, visibility, sessionId } = parsed.data;
  const mediaParsed = normalizePostMediaFromRequest(parsed.data.media);
  if (mediaParsed === null) {
    return validationError([{ message: "Formato de imágenes no válido" }]);
  }

  try {
    const author = await findUserById(userId);
    if (!author) {
      return NextResponse.json(
        { code: "AUTH_SESSION_STALE", message: "Usuario no encontrado en la base de datos" },
        { status: 401 }
      );
    }

    const rows = await query<PostRow>(
      `INSERT INTO posts (user_id, content, format, visibility, session_id, media)
       VALUES ($1, $2, $3, $4, $5, NULL)
       RETURNING id, user_id, content, format, visibility, session_id, media, created_at, updated_at`,
      [userId, content, format, visibility, sessionId ?? null]
    );
    const created = rows[0];
    if (!created) return serverError("No se pudo crear la publicación");

    if (mediaParsed && mediaParsed.length > 0) {
      const stored = persistPostMediaItems(created.id, mediaParsed);
      const mediaJson = stored.length > 0 ? JSON.stringify(stored) : null;
      await query(`UPDATE posts SET media = $2::jsonb WHERE id = $1`, [created.id, mediaJson]);
    }

    const enriched = await getPostForClient(created.id, userId);
    if (enriched) {
      return NextResponse.json(enriched, { status: 201 });
    }

    return NextResponse.json(
      mapPostForClient(mapPostRow(created), {
        authorUsername: author.username,
        authorAvatarUrl: author.avatar_url,
        comments: [],
      }),
      { status: 201 }
    );
  } catch {
    return serverError("No se pudo crear la publicación");
  }
}
