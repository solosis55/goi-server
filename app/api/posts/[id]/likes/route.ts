import { NextResponse } from "next/server";
import { requireAuthUserId } from "@/lib/auth/requestAuth";
import { jsonError, serverError } from "@/lib/http/apiError";
import { listPostLikesForClient, togglePostLike } from "@/lib/likes/repository";
import { postExists } from "@/lib/posts/listPostsWithRelations";
import { findUserById } from "@/lib/users/repository";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const auth = requireAuthUserId(request);
  if (auth instanceof Response) return auth;

  const { id } = await context.params;
  if (!(await postExists(id))) {
    return jsonError(404, "POST_NOT_FOUND", "La publicación no existe");
  }

  try {
    const body = await listPostLikesForClient(id);
    return NextResponse.json(body);
  } catch {
    return serverError("No se pudieron listar los me gusta");
  }
}

export async function POST(request: Request, context: RouteContext) {
  const auth = requireAuthUserId(request);
  if (auth instanceof Response) return auth;

  const { id } = await context.params;
  if (!(await postExists(id))) {
    return jsonError(404, "POST_NOT_FOUND", "La publicación no existe");
  }

  const user = await findUserById(auth);
  if (!user) {
    return jsonError(401, "AUTH_SESSION_STALE", "Usuario no encontrado en la base de datos");
  }

  try {
    const result = await togglePostLike(id, auth);
    return NextResponse.json(result);
  } catch {
    return serverError("No se pudo actualizar el me gusta");
  }
}
