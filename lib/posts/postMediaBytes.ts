import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getUploadsRoot } from "@/lib/data/paths";

const DATA_IMAGE_RE = /^data:image\/([\w+.-]+);base64,([\s\S]+)$/;

export type MediaBytes = { data: Uint8Array; contentType: string };

function mimeFromExt(ext: string): string {
  const e = ext.toLowerCase();
  if (e === "png") return "image/png";
  if (e === "webp") return "image/webp";
  if (e === "gif") return "image/gif";
  return "image/jpeg";
}

/** Decodifica adjunto guardado en post (data URL o ruta `/uploads/...`). */
export async function readPostMediaBytes(url: string): Promise<MediaBytes | null> {
  const u = url.trim();
  if (!u) return null;

  const dataMatch = DATA_IMAGE_RE.exec(u);
  if (dataMatch) {
    const subtype = dataMatch[1].toLowerCase();
    const contentType = subtype.includes("/") ? `image/${subtype}` : `image/${subtype}`;
    const data = Buffer.from(dataMatch[2], "base64");
    if (data.length === 0) return null;
    return { data, contentType };
  }

  if (u.startsWith("/uploads/")) {
    const rel = u.replace(/^\/uploads\//, "");
    const filePath = join(getUploadsRoot(), rel);
    try {
      const data = await readFile(filePath);
      const ext = rel.split(".").pop() ?? "jpg";
      return { data, contentType: mimeFromExt(ext) };
    } catch {
      return null;
    }
  }

  return null;
}
