import { Buffer } from "node:buffer";
import type { ClientPost } from "@/lib/types/clientPost";

export function encodePostCursor(post: { createdAt: string; id: string }): string {
  return Buffer.from(JSON.stringify({ c: post.createdAt, i: post.id }), "utf8").toString("base64url");
}

export function decodePostCursor(raw: string): { createdAt: string; id: string } | null {
  try {
    const s = String(raw).trim();
    if (!s) return null;
    const json = Buffer.from(s, "base64url").toString("utf8");
    const o = JSON.parse(json) as { c?: unknown; i?: unknown };
    if (typeof o.c === "string" && typeof o.i === "string") return { createdAt: o.c, id: o.i };
  } catch {
    /* ignore */
  }
  return null;
}

export function cursorFromClientPost(post: ClientPost): string {
  return encodePostCursor({ createdAt: post.createdAt, id: post.id });
}
