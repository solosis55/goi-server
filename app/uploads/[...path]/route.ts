import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { getUploadsRoot } from "@/lib/data/paths";

type RouteContext = { params: Promise<{ path: string[] }> };

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export async function GET(_request: Request, context: RouteContext) {
  const { path } = await context.params;
  if (!path?.length || path.some((p) => p.includes(".."))) {
    return new NextResponse(null, { status: 404 });
  }

  const filePath = join(getUploadsRoot(), ...path);
  if (!existsSync(filePath)) {
    return new NextResponse(null, { status: 404 });
  }

  const ext = path[path.length - 1]?.match(/\.[^.]+$/)?.[0]?.toLowerCase() ?? "";
  const mime = MIME[ext] ?? "application/octet-stream";
  const buf = readFileSync(filePath);
  return new NextResponse(buf, {
    headers: {
      "Content-Type": mime,
      "Cache-Control": "public, max-age=86400",
    },
  });
}
