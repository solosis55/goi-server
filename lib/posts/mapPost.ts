import type { ApiPost, PostMediaItem, PostRow } from "../types/post";

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

export function parsePostMedia(raw: unknown): PostMediaItem[] | undefined {
  const parsed = mediaArrayFromRaw(raw);
  if (!Array.isArray(parsed) || parsed.length === 0) return undefined;
  const items = parsed.filter(
    (m): m is PostMediaItem =>
      Boolean(m) &&
      typeof m === "object" &&
      (m as PostMediaItem).type === "image" &&
      typeof (m as PostMediaItem).url === "string" &&
      (m as PostMediaItem).url.length > 0 &&
      !(m as PostMediaItem).url.trim().toLowerCase().startsWith("data:")
  );
  return items.length > 0 ? items : undefined;
}

export function mapPostRow(row: PostRow): ApiPost {
  const media = parsePostMedia(row.media);
  return {
    id: row.id,
    userId: row.user_id,
    content: row.content,
    format: row.format,
    visibility: row.visibility,
    sessionId: row.session_id,
    ...(media ? { media } : {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
