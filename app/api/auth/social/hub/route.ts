import { NextResponse } from "next/server";
import { requireAuthUserId } from "@/lib/auth/requestAuth";
import { serverError } from "@/lib/http/apiError";
import { buildSocialHubPayload } from "@/lib/social/socialHub";

export async function GET(request: Request) {
  const auth = requireAuthUserId(request);
  if (auth instanceof Response) return auth;

  const url = new URL(request.url);
  const lite = url.searchParams.get("lite") === "1" || url.searchParams.get("lite") === "true";

  try {
    const payload = await buildSocialHubPayload(auth, { lite });
    return NextResponse.json(payload);
  } catch {
    return serverError("No se pudo cargar el hub social");
  }
}
