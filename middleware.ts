import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** CORS para Goi Web (Vite :5173) y Expo durante la migración. */
export function middleware(request: NextRequest) {
  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: corsHeaders(),
    });
  }

  const response = NextResponse.next();
  for (const [key, value] of corsHeaders()) {
    response.headers.set(key, value);
  }
  return response;
}

function corsHeaders(): [string, string][] {
  return [
    ["Access-Control-Allow-Origin", "*"],
    ["Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS"],
    ["Access-Control-Allow-Headers", "Content-Type, Authorization"],
  ];
}

export const config = {
  matcher: "/api/:path*",
};
