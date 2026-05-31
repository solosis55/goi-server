import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http/apiError";
import { postExists } from "@/lib/posts/listPostsWithRelations";

type RouteContext = { params: Promise<{ id: string }> };

/** Likes aún no persistidos — stub para no romper la UI de Goi App. */
export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!(await postExists(id))) {
    return jsonError(404, "POST_NOT_FOUND", "La publicación no existe");
  }
  return NextResponse.json({ likes: [], total: 0 });
}

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!(await postExists(id))) {
    return jsonError(404, "POST_NOT_FOUND", "La publicación no existe");
  }
  return NextResponse.json({ liked: false });
}
