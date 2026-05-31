import { query } from "@/lib/db";
import { mapCommentRow } from "@/lib/comments/mapComment";
import { mapPostRow } from "@/lib/posts/mapPost";
import { LIST_POSTS_WITH_RELATIONS_SQL } from "@/lib/posts/postsJoinQuery";
import type { ApiComment, CommentRow } from "@/lib/types/comment";
import type { ApiPost, PostRow } from "@/lib/types/post";

export type ApiPostWithRelations = ApiPost & {
  comments: ApiComment[];
  tags: string[];
};

type JoinRow = PostRow & {
  comments: CommentRow[] | null;
  tags: (string | null)[] | null;
};

function normalizeComments(raw: CommentRow[] | null): ApiComment[] {
  if (!raw?.length) return [];
  return raw.map(mapCommentRow);
}

function normalizeTags(raw: (string | null)[] | null): string[] {
  if (!raw?.length) return [];
  return raw.filter((t): t is string => typeof t === "string" && t.length > 0);
}

export async function listPostsWithRelations(): Promise<ApiPostWithRelations[]> {
  const rows = await query<JoinRow>(LIST_POSTS_WITH_RELATIONS_SQL);
  return rows.map((row) => ({
    ...mapPostRow(row),
    comments: normalizeComments(row.comments),
    tags: normalizeTags(row.tags),
  }));
}

export async function listCommentsForPost(postId: string): Promise<ApiComment[]> {
  const rows = await query<CommentRow>(
    `SELECT id, post_id, user_id, content, created_at, updated_at
     FROM post_comments
     WHERE post_id = $1
     ORDER BY created_at ASC`,
    [postId]
  );
  return rows.map(mapCommentRow);
}

export async function postExists(postId: string): Promise<boolean> {
  const rows = await query<{ id: string }>(`SELECT id FROM posts WHERE id = $1`, [postId]);
  return Boolean(rows[0]);
}
