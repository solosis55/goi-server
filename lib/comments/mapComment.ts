import type { ApiComment, CommentRow } from "../types/comment";

export function mapCommentRow(row: CommentRow): ApiComment {
  return {
    id: row.id,
    postId: row.post_id,
    userId: row.user_id,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
