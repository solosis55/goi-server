import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getPostsMediaDir } from "@/lib/data/paths";
import type { PostMediaItem } from "@/lib/types/post";

const DATA_IMAGE_RE = /^data:image\/([\w+.-]+);base64,([\s\S]+)$/;

function extForSubtype(subtype: string): string {
  const s = subtype.toLowerCase();
  if (s === "png") return ".png";
  if (s === "webp") return ".webp";
  return ".jpg";
}

export function postMediaPublicPath(postId: string, index: number, ext: string): string {
  return `/uploads/posts/${postId}/${index}${ext}`;
}

export function writePostMediaFile(
  postId: string,
  index: number,
  buffer: Buffer,
  ext: string
): string {
  const dir = join(getPostsMediaDir(), postId);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${index}${ext}`), buffer);
  return postMediaPublicPath(postId, index, ext);
}

export function dataUrlToBuffer(dataUrl: string): { buffer: Buffer; ext: string } | null {
  const m = DATA_IMAGE_RE.exec(dataUrl.trim());
  if (!m) return null;
  const buffer = Buffer.from(m[2], "base64");
  if (buffer.length === 0) return null;
  return { buffer, ext: extForSubtype(m[1]) };
}

/** Convierte data URLs o conserva rutas `/uploads/posts/...` ya persistidas. */
export function persistPostMediaItems(
  postId: string,
  items: PostMediaItem[]
): PostMediaItem[] {
  const out: PostMediaItem[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.type !== "image" || !item.url?.trim()) continue;

    const url = item.url.trim();
    if (url.startsWith("/uploads/posts/")) {
      out.push({ type: "image", url });
      continue;
    }

    if (url.startsWith("data:image")) {
      const decoded = dataUrlToBuffer(url);
      if (!decoded) continue;
      const pathname = writePostMediaFile(postId, i, decoded.buffer, decoded.ext);
      out.push({ type: "image", url: pathname });
      continue;
    }

    if (url.startsWith("http://") || url.startsWith("https://")) {
      out.push({ type: "image", url });
    }
  }

  return out;
}
