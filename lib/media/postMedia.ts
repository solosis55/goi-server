/** Adjuntos de publicaciones (MVP: imágenes en data URL, como Express legacy). */

export const POST_MEDIA_MAX_ITEMS = 4;
export const POST_MEDIA_MAX_CHARS_PER_IMAGE = 360_000;
export const POST_MEDIA_MAX_TOTAL_CHARS = 1_050_000;

export type PersistedPostImage = { type: "image"; url: string };

const DATA_IMAGE_RE = /^data:image\/(jpeg|jpg|png|webp);base64,/i;

function parseMediaItems(
  raw: unknown,
  maxItems: number,
  maxTotalChars: number
): PersistedPostImage[] | null {
  if (!Array.isArray(raw)) return null;
  if (raw.length > maxItems) return null;
  const out: PersistedPostImage[] = [];
  let totalChars = 0;
  for (const item of raw) {
    if (!item || typeof item !== "object") return null;
    const t = (item as { type?: unknown }).type;
    const url = (item as { url?: unknown }).url;
    if (t !== "image" || typeof url !== "string") return null;
    if (!DATA_IMAGE_RE.test(url)) return null;
    if (url.length > POST_MEDIA_MAX_CHARS_PER_IMAGE) return null;
    totalChars += url.length;
    if (totalChars > maxTotalChars) return null;
    out.push({ type: "image", url });
  }
  return out;
}

export function normalizePostMediaFromRequest(raw: unknown): PersistedPostImage[] | undefined | null {
  if (raw === undefined) return undefined;
  if (raw === null) return [];
  return parseMediaItems(raw, POST_MEDIA_MAX_ITEMS, POST_MEDIA_MAX_TOTAL_CHARS);
}
