import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "goi-server",
    message: "API Goi en marcha",
  });
}
