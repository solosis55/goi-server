import { NextResponse } from "next/server";
import { requireAuthUserId } from "@/lib/auth/requestAuth";
import { listPendingIncomingRequests } from "@/lib/social/followsRepository";
import { serverError } from "@/lib/http/apiError";

export async function GET(request: Request) {
  const auth = requireAuthUserId(request);
  if (auth instanceof Response) return auth;

  try {
    const requests = await listPendingIncomingRequests(auth);
    return NextResponse.json({ requests });
  } catch {
    return serverError("No se pudieron cargar solicitudes");
  }
}
