import { NextResponse } from "next/server";
import { requireAuthUserId } from "@/lib/auth/requestAuth";
import { getBlockedIdsForUser } from "@/lib/social/blocksRepository";
import { serverError } from "@/lib/http/apiError";
import { findUsersByIds } from "@/lib/users/repository";

export async function GET(request: Request) {
  const auth = requireAuthUserId(request);
  if (auth instanceof Response) return auth;

  try {
    const blockedIds = await getBlockedIdsForUser(auth);
    const found = await findUsersByIds(blockedIds);
    const byId = new Map(found.map((u) => [u.id, u]));
    const users = blockedIds.map((id) => {
      const u = byId.get(id);
      return {
        id,
        username: u?.username ?? "Usuario",
        avatarUrl: u?.avatar_url ?? "",
      };
    });
    return NextResponse.json({ users });
  } catch {
    return serverError("No se pudieron cargar usuarios bloqueados");
  }
}
