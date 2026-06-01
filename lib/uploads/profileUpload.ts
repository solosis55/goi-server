import { randomBytes } from "node:crypto";
import { mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { getAvatarsDir, getBannersDir } from "@/lib/data/paths";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 2 * 1024 * 1024;

function extForMime(mime: string): string {
  if (mime === "image/png") return ".png";
  if (mime === "image/webp") return ".webp";
  return ".jpg";
}

export function buildPublicAssetUrl(request: Request, pathname: string): string {
  const url = new URL(request.url);
  const proto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
    url.protocol.replace(/:$/, "") ||
    "http";
  const host =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    request.headers.get("host") ||
    url.host;
  if (!host) return pathname;
  return `${proto}://${host}${pathname}`;
}

export function tryRemoveOldProfileUpload(
  previousUrl: string,
  userId: string,
  kind: "avatars" | "banners"
): void {
  if (!previousUrl || !previousUrl.includes(`/uploads/${kind}/`)) return;
  let name: string;
  try {
    name = basename(new URL(previousUrl).pathname);
  } catch {
    const marker = `/uploads/${kind}/`;
    const i = previousUrl.indexOf(marker);
    name = basename(previousUrl.slice(i + marker.length).split(/[?#]/)[0] ?? "");
  }
  if (!name || name.includes("..") || name.includes("/") || name.includes("\\")) return;
  if (!name.startsWith(`${userId}-`)) return;
  const dir = kind === "avatars" ? getAvatarsDir() : getBannersDir();
  try {
    unlinkSync(join(dir, name));
  } catch {
    /* missing file */
  }
}

export async function saveProfileImageUpload(
  userId: string,
  kind: "avatars" | "banners",
  file: File
): Promise<{ filename: string; pathname: string }> {
  if (!ALLOWED.has(file.type)) {
    throw Object.assign(new Error("unsupported image type"), { code: "PROFILE_IMAGE_INVALID" });
  }
  if (file.size > MAX_BYTES) {
    throw Object.assign(new Error("file too large"), { code: "PROFILE_IMAGE_TOO_LARGE" });
  }

  const dir = kind === "avatars" ? getAvatarsDir() : getBannersDir();
  mkdirSync(dir, { recursive: true });
  const ext = extForMime(file.type);
  const filename = `${userId}-${Date.now().toString(36)}-${randomBytes(5).toString("hex")}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  writeFileSync(join(dir, filename), buffer);
  return { filename, pathname: `/uploads/${kind}/${filename}` };
}
