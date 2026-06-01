import { NextResponse } from "next/server";
import { requireAuthUserId } from "@/lib/auth/requestAuth";
import { loadOutgoingFollowStatusMap, mapUserToDiscoverDto } from "@/lib/discover/discoverDto";
import { searchDiscoverableUsers } from "@/lib/discover/userSearch";
import { serverError } from "@/lib/http/apiError";

export async function GET(request: Request) {
  const auth = requireAuthUserId(request);
  if (auth instanceof Response) return auth;

  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const limitRaw = Number(url.searchParams.get("limit"));
  const limit = Number.isFinite(limitRaw) ? limitRaw : 24;

  try {
    const [matches, statusMap] = await Promise.all([
      searchDiscoverableUsers(auth, q, limit),
      loadOutgoingFollowStatusMap(auth),
    ]);
    const users = matches.map((u) => mapUserToDiscoverDto(u, auth, statusMap));
    return NextResponse.json({ users });
  } catch {
    return serverError("No se pudo buscar usuarios");
  }
}
