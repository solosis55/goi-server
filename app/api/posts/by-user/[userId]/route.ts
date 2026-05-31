import { NextResponse } from "next/server";
import { listPostsByUserForClient } from "@/lib/posts/listPostsWithRelations";
import { serverError } from "@/lib/http/apiError";
import type { PostsByUserPageResponse } from "@/lib/types/clientPost";

type RouteContext = { params: Promise<{ userId: string }> };

/** Publicaciones de un usuario (perfil). */
export async function GET(request: Request, context: RouteContext) {
  const { userId } = await context.params;

  try {
    const url = new URL(request.url);
    const limitRaw = Number(url.searchParams.get("limit"));
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 50) : 20;

    const all = await listPostsByUserForClient(userId);
    const posts = all.slice(0, limit);

    const body: PostsByUserPageResponse = {
      posts,
      nextCursor: null,
      total: all.length,
    };

    return NextResponse.json(body);
  } catch {
    return serverError("No se pudieron listar las publicaciones del usuario");
  }
}
