import { NextResponse } from "next/server";
import { getAuthUserIdFromRequest } from "@/lib/auth/requestAuth";
import { serverError, validationError } from "@/lib/http/apiError";
import { listPostsByIdsForClient } from "@/lib/posts/postsByIds";

/** Publicaciones por id (guardados locales, etc.). Query: `ids=id1,id2` (máx. 50). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const raw = url.searchParams.get("ids")?.trim() ?? "";
  const ids = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (ids.length === 0) {
    return validationError([{ message: "ids requerido" }]);
  }

  try {
    const viewerUserId = getAuthUserIdFromRequest(request);
    const posts = await listPostsByIdsForClient(ids, viewerUserId);
    return NextResponse.json({ posts });
  } catch {
    return serverError("No se pudieron cargar las publicaciones");
  }
}
