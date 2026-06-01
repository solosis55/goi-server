import { NextResponse } from "next/server";
import { getAuthUserIdFromRequest } from "@/lib/auth/requestAuth";
import { decodePostCursor } from "@/lib/posts/postCursor";
import { listPostsByUserPageForClient } from "@/lib/posts/listPostsWithRelations";
import { serverError, validationError } from "@/lib/http/apiError";
import type { PostsByUserPageResponse } from "@/lib/types/clientPost";

type RouteContext = { params: Promise<{ userId: string }> };

/** Publicaciones de un usuario (perfil, paginado en SQL). */
export async function GET(request: Request, context: RouteContext) {
  const { userId } = await context.params;

  try {
    const url = new URL(request.url);
    const limitRaw = Number(url.searchParams.get("limit"));
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 50) : 20;
    const cursorRaw = url.searchParams.get("cursor")?.trim() || null;
    if (cursorRaw && !decodePostCursor(cursorRaw)) {
      return validationError([{ message: "cursor inválido" }]);
    }

    const viewerUserId = getAuthUserIdFromRequest(request);
    const page = await listPostsByUserPageForClient(userId, viewerUserId, {
      limit,
      cursor: cursorRaw,
      grid: true,
    });

    const body: PostsByUserPageResponse = {
      posts: page.posts,
      nextCursor: page.nextCursor,
      total: page.total,
    };

    return NextResponse.json(body);
  } catch {
    return serverError("No se pudieron listar las publicaciones del usuario");
  }
}
