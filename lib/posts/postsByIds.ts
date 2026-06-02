import { query } from "@/lib/db";
import { enrichPostsWithSessionMeta } from "@/lib/posts/postSessionMeta";
import { mapPostForClient, normalizeCommentsJson } from "@/lib/posts/mapPostForClient";
import { mapPostRow } from "@/lib/posts/mapPost";
import { LIST_POSTS_BY_IDS_GRID_SQL } from "@/lib/posts/postsJoinQuery";
import type { ClientPost } from "@/lib/types/clientPost";
import type { PostRow } from "@/lib/types/post";

const MAX_IDS = 50;

type JoinRow = PostRow & {
  author_username: string;
  author_avatar_url: string;
  likes_count: number;
  liked_by_me: boolean;
  comments: unknown;
  tags: unknown;
};

function postVisibilitySql(viewerParam: string): string {
  return `(
    ${viewerParam}::uuid IS NOT NULL
    AND p.user_id = ${viewerParam}::uuid
    OR p.visibility = 'public'
    OR (
      ${viewerParam}::uuid IS NOT NULL
      AND p.visibility = 'followers'
      AND EXISTS (
        SELECT 1 FROM follows f
        WHERE f.follower_id = ${viewerParam}::uuid
          AND f.following_id = p.user_id
          AND f.status = 'active'
      )
    )
  )`;
}

export async function listPostsByIdsForClient(
  ids: string[],
  viewerUserId: string | null | undefined
): Promise<ClientPost[]> {
  const unique = [...new Set(ids.filter((id) => typeof id === "string" && id.trim()))].slice(
    0,
    MAX_IDS
  );
  if (unique.length === 0) return [];

  const viewer = viewerUserId ?? null;
  const visibility = postVisibilitySql("$2");

  const rows = await query<JoinRow>(
    `${LIST_POSTS_BY_IDS_GRID_SQL}
     AND ${visibility}
     ORDER BY p.created_at DESC, p.id DESC`,
    [unique, viewer]
  );

  const posts = rows.map((row) =>
    mapPostForClient(mapPostRow(row), {
      authorUsername: row.author_username,
      authorAvatarUrl: row.author_avatar_url,
      comments: normalizeCommentsJson(row.comments),
      likesCount: Number(row.likes_count) || 0,
      likedByMe: Boolean(row.liked_by_me),
    })
  );

  const enriched = await enrichPostsWithSessionMeta(posts);
  const order = new Map(unique.map((id, i) => [id, i]));
  return enriched.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}

export async function listLinkedSessionIdsForUser(userId: string): Promise<string[]> {
  const rows = await query<{ session_id: string }>(
    `SELECT DISTINCT session_id
     FROM posts
     WHERE user_id = $1::uuid AND session_id IS NOT NULL`,
    [userId]
  );
  return rows.map((r) => r.session_id);
}
