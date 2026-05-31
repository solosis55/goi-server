import type { ApiPost, PostRow } from "../types/post";

export function mapPostRow(row: PostRow): ApiPost {
  return {
    id: row.id,
    userId: row.user_id,
    content: row.content,
    format: row.format,
    visibility: row.visibility,
    sessionId: row.session_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
