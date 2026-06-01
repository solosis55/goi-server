import { NextResponse } from "next/server";
import { requireAuthUserId } from "@/lib/auth/requestAuth";
import { serverError } from "@/lib/http/apiError";
import { findUsersByIds } from "@/lib/users/repository";

export async function GET(request: Request) {
  const auth = requireAuthUserId(request);
  if (auth instanceof Response) return auth;

  const url = new URL(request.url);
  const raw = url.searchParams.get("ids") ?? "";
  const ids = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 64);

  try {
    const found = await findUsersByIds(ids);
    const byId = new Map(found.map((u) => [u.id, u]));
    const users = ids.map((id) => {
      const u = byId.get(id);
      return {
        id,
        username: u?.username ?? "Usuario",
        avatarUrl: u?.avatar_url ?? "",
      };
    });
    return NextResponse.json({ users });
  } catch {
    return serverError("No se pudieron cargar vistas previas");
  }
}
