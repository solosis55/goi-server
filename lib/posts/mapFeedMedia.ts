import type { PostMediaItem } from "@/lib/types/post";

function mediaArrayFromRaw(raw: unknown): unknown {
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      return undefined;
    }
  }
  return raw;
}

/** URLs de feed (sin data URLs legacy). */
export function parseFeedMediaJson(raw: unknown): PostMediaItem[] | undefined {
  const parsed = mediaArrayFromRaw(raw);
  if (!Array.isArray(parsed) || parsed.length === 0) return undefined;
  const items = parsed.filter(
    (m): m is PostMediaItem =>
      Boolean(m) &&
      typeof m === "object" &&
      (m as PostMediaItem).type === "image" &&
      typeof (m as PostMediaItem).url === "string" &&
      (m as PostMediaItem).url.length > 0 &&
      !(m as PostMediaItem).url.startsWith("data:")
  );
  return items.length > 0 ? items : undefined;
}
