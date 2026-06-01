export const STORY_SLIDES_MAX = 15;
export const STORY_MEDIA_MAX_TOTAL_CHARS = 2_400_000;

export type StorySlideInput = { type: "image"; url: string };

const DATA_IMAGE_RE = /^data:image\/(jpeg|jpg|png|webp);base64,/i;
const MAX_PER_IMAGE = 1_600_000;

function parseMediaItems(
  raw: unknown,
  maxItems: number,
  maxTotalChars: number
): StorySlideInput[] | null {
  if (!Array.isArray(raw)) return null;
  if (raw.length > maxItems || raw.length === 0) return null;
  const out: StorySlideInput[] = [];
  let totalChars = 0;
  for (const item of raw) {
    if (!item || typeof item !== "object") return null;
    const t = (item as { type?: unknown }).type;
    const url = (item as { url?: unknown }).url;
    if (t !== "image" || typeof url !== "string") return null;
    if (!DATA_IMAGE_RE.test(url)) return null;
    if (url.length > MAX_PER_IMAGE) return null;
    totalChars += url.length;
    if (totalChars > maxTotalChars) return null;
    out.push({ type: "image", url });
  }
  return out;
}

export function parseStorySlidesFromRequest(raw: unknown): StorySlideInput[] | null {
  return parseMediaItems(raw, STORY_SLIDES_MAX, STORY_MEDIA_MAX_TOTAL_CHARS);
}
