import { query } from "@/lib/db";
import { mapCommentRow } from "@/lib/comments/mapComment";
import { mapPostRow } from "@/lib/posts/mapPost";
import {
  mapPostForClient,
  normalizeCommentsJson,
} from "@/lib/posts/mapPostForClient";
import {
  GET_POST_WITH_RELATIONS_SQL,
  LIST_POSTS_BY_USER_SQL,
  LIST_POSTS_WITH_RELATIONS_SQL,
} from "@/lib/posts/postsJoinQuery";
import type { ClientPost } from "@/lib/types/clientPost";
import type { ApiComment, CommentRow } from "@/lib/types/comment";
import type { PostRow } from "@/lib/types/post";

type JoinRow = PostRow & {
  author_username: string;
  author_avatar_url: string;
  comments: unknown;
  tags: unknown;
};

function rowToClientPost(row: JoinRow): ClientPost {
  const post = mapPostRow(row);
  return mapPostForClient(post, {
    authorUsername: row.author_username,
    authorAvatarUrl: row.author_avatar_url,
    comments: normalizeCommentsJson(row.comments),
  });
}

export async function listPostsForClient(): Promise<ClientPost[]> {
  const rows = await query<JoinRow>(LIST_POSTS_WITH_RELATIONS_SQL);
  return rows.map(rowToClientPost);
}

export async function listPostsByUserForClient(userId: string): Promise<ClientPost[]> {
  const rows = await query<JoinRow>(LIST_POSTS_BY_USER_SQL, [userId]);
  return rows.map(rowToClientPost);
}

export async function getPostForClient(postId: string): Promise<ClientPost | null> {
  const rows = await query<JoinRow>(GET_POST_WITH_RELATIONS_SQL, [postId]);
  const row = rows[0];
  if (!row) return null;
  return rowToClientPost(row);
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

/** @deprecated Usar listPostsForClient — conservado para compat interna. */
export async function listPostsWithRelations() {
  return listPostsForClient();
}
