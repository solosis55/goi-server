import { NextResponse } from "next/server";
import { requireAuthUserId } from "@/lib/auth/requestAuth";
import { getDiscoverPage } from "@/lib/discover/discoverService";
import { serverError } from "@/lib/http/apiError";

export async function GET(request: Request) {
  const auth = requireAuthUserId(request);
  if (auth instanceof Response) return auth;

  const url = new URL(request.url);
  const limitRaw = Number(url.searchParams.get("limit"));
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(1, limitRaw), 48) : 24;
  const offsetRaw = Number(url.searchParams.get("offset"));
  const offset = Number.isFinite(offsetRaw) ? Math.max(0, Math.floor(offsetRaw)) : 0;
  const facetRaw = url.searchParams.get("facet");

  try {
    const page = await getDiscoverPage(auth, { limit, offset, facetRaw });
    return NextResponse.json(page);
  } catch {
    return serverError("No se pudo cargar descubrir");
  }
}
