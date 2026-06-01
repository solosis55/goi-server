import { NextResponse } from "next/server";
import { getAuthUserIdFromRequest } from "@/lib/auth/requestAuth";
import { filterPostsForFeed } from "@/lib/posts/feedVisibility";
import { listPostsForFeed } from "@/lib/posts/listPostsWithRelations";
import { serverError } from "@/lib/http/apiError";
import type { FeedPageResponse } from "@/lib/types/clientPost";

/** Feed paginado; scope=following filtra por seguidos en Neon. */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const scopeRaw = url.searchParams.get("scope");
    const scope = scopeRaw === "following" ? "following" : "all";
    const limitRaw = Number(url.searchParams.get("limit"));
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 50) : 20;

    const viewerUserId = getAuthUserIdFromRequest(request);
    if (scope === "following" && !viewerUserId) {
      const empty: FeedPageResponse = { items: [], nextCursor: null, hasMore: false };
      return NextResponse.json(empty);
    }

    const fetchLimit = Math.min(limit * 3, 80);
    const batch = await listPostsForFeed(viewerUserId, fetchLimit);
    const visible = await filterPostsForFeed(batch, viewerUserId, scope);
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
