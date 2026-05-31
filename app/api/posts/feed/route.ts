import { NextResponse } from "next/server";
import { listPostsForClient } from "@/lib/posts/listPostsWithRelations";
import { serverError } from "@/lib/http/apiError";
import type { FeedPageResponse } from "@/lib/types/clientPost";

/**
 * Feed paginado para Goi App.
 * Fase 7: devuelve todos los posts públicos (sin filtro following/likes aún).
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const limitRaw = Number(url.searchParams.get("limit"));
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 50) : 20;

    const all = await listPostsForClient();
    const visible = all.filter((p) => p.visibility === "public" || p.visibility === "followers");
    const slice = visible.slice(0, limit);

    const body: FeedPageResponse = {
      items: slice.map((post) => ({ kind: "post", post })),
      nextCursor: null,
      hasMore: false,
    };

    return NextResponse.json(body);
  } catch {
    return serverError("No se pudo cargar el feed");
  }
}
