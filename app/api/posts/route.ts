import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAuthUserIdFromRequest, requireAuthUserId } from "@/lib/auth/requestAuth";
import { serverError, validationError } from "@/lib/http/apiError";
import { getPostForClient, listPostsForFeed } from "@/lib/posts/listPostsWithRelations";
import { mapPostForClient } from "@/lib/posts/mapPostForClient";
import { mapPostRow } from "@/lib/posts/mapPost";
import { persistPostMediaItems } from "@/lib/uploads/postMediaStorage";
import { persistPostImageFiles } from "@/lib/uploads/postImageUpload";
import { parseCreatePostRequest } from "@/lib/posts/parseCreatePostRequest";
import { findUserById } from "@/lib/users/repository";
import type { PostRow } from "@/lib/types/post";

const LEGACY_LIST_CAP = 50;

/** GET listado acotado (legacy). POST crea publicación (JSON o multipart). */
export async function GET(request: Request) {
  try {
    const viewerUserId = getAuthUserIdFromRequest(request);
    const posts = await listPostsForFeed(viewerUserId, LEGACY_LIST_CAP);
    return NextResponse.json(posts);
  } catch {
    return serverError("No se pudieron listar las publicaciones");
  }
}

export async function POST(request: Request) {
  const auth = requireAuthUserId(request);
  if (auth instanceof Response) return auth;
  const userId = auth;

  const parsed = await parseCreatePostRequest(request);
  if (parsed instanceof Response) return parsed;

  const { content, format, visibility, sessionId, media, files } = parsed;

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
      [userId, content, format, visibility, sessionId]
    );
    const created = rows[0];
    if (!created) return serverError("No se pudo crear la publicación");

    let storedMedia: { type: "image"; url: string }[] = [];
    if (files.length > 0) {
      try {
        storedMedia = await persistPostImageFiles(created.id, files);
      } catch (err) {
        const code = (err as { code?: string }).code;
        if (code === "POST_IMAGE_INVALID" || code === "POST_IMAGE_TOO_LARGE") {
          await query(`DELETE FROM posts WHERE id = $1`, [created.id]);
          return validationError([{ message: (err as Error).message }]);
        }
        throw err;
      }
    } else if (media && media.length > 0) {
      storedMedia = persistPostMediaItems(created.id, media);
    }

    if (storedMedia.length > 0) {
      await query(`UPDATE posts SET media = $2::jsonb WHERE id = $1`, [
        created.id,
        JSON.stringify(storedMedia),
      ]);
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
