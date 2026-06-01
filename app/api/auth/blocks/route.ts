import { NextResponse } from "next/server";
import { requireAuthUserId } from "@/lib/auth/requestAuth";
import { getBlockedIdsForUser } from "@/lib/social/blocksRepository";
import { serverError } from "@/lib/http/apiError";

export async function GET(request: Request) {
  const auth = requireAuthUserId(request);
  if (auth instanceof Response) return auth;

  try {
    const blockedIds = await getBlockedIdsForUser(auth);
    return NextResponse.json({ blockedIds });
  } catch {
    return serverError("No se pudo listar bloqueos");
  }
}
