import { NextResponse } from "next/server";
import { requireAuthUserId } from "@/lib/auth/requestAuth";
import { getOutgoingFollowStatusMap } from "@/lib/social/followsRepository";
import { serverError } from "@/lib/http/apiError";
import { listUsersExcept } from "@/lib/users/repository";
import { mapUserRowToSafeUser } from "@/lib/users/types";

export async function GET(request: Request) {
  const auth = requireAuthUserId(request);
  if (auth instanceof Response) return auth;

  try {
    const [rows, followMap] = await Promise.all([
      listUsersExcept(auth),
      getOutgoingFollowStatusMap(auth),
    ]);
    const users = rows.map((user) => ({
      ...mapUserRowToSafeUser(user, { includeEmail: false }),
      isFollowing: followMap.get(user.id) === "active",
    }));
    return NextResponse.json({ users });
  } catch {
    return serverError("No se pudo listar usuarios");
  }
}
