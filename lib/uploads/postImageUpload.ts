import { writePostMediaFile } from "@/lib/uploads/postMediaStorage";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);
export const POST_IMAGE_MAX_BYTES = 4 * 1024 * 1024;

function extForMime(mime: string): string {
  if (mime === "image/png") return ".png";
  if (mime === "image/webp") return ".webp";
  return ".jpg";
}

export async function readPostImageFile(file: File): Promise<{ buffer: Buffer; ext: string }> {
  if (!ALLOWED.has(file.type)) {
    throw Object.assign(new Error("unsupported image type"), { code: "POST_IMAGE_INVALID" });
  }
  if (file.size > POST_IMAGE_MAX_BYTES) {
    throw Object.assign(new Error("file too large"), { code: "POST_IMAGE_TOO_LARGE" });
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length === 0) {
    throw Object.assign(new Error("empty file"), { code: "POST_IMAGE_INVALID" });
  }
  return { buffer, ext: extForMime(file.type) };
}

export async function persistPostImageFiles(
  postId: string,
  files: File[],
  startIndex = 0
): Promise<{ type: "image"; url: string }[]> {
  const out: { type: "image"; url: string }[] = [];
  for (let i = 0; i < files.length; i++) {
    const { buffer, ext } = await readPostImageFile(files[i]!);
    const pathname = writePostMediaFile(postId, startIndex + i, buffer, ext);
    out.push({ type: "image", url: pathname });
  }
  return out;
}
