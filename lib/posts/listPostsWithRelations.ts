import { query } from "@/lib/db";
import { mapCommentRow } from "@/lib/comments/mapComment";
import { parseFeedMediaJson } from "@/lib/posts/mapFeedMedia";
import { mapPostRow } from "@/lib/posts/mapPost";
import {
  mapPostForClient,
  normalizeCommentsJson,
} from "@/lib/posts/mapPostForClient";
import {
  buildListPostsFeedPageSql,
  GET_POST_WITH_RELATIONS_SQL,
  LIST_POSTS_BY_USER_GRID_SQL,
  LIST_POSTS_BY_USER_SQL,
} from "@/lib/posts/postsJoinQuery";
import { cursorFromClientPost, decodePostCursor } from "@/lib/posts/postCursor";
import { filterPostsForFeed } from "@/lib/posts/feedVisibility";
import { enrichPostsWithSessionMeta } from "@/lib/posts/postSessionMeta";
import type { ClientPost } from "@/lib/types/clientPost";
import type { ApiComment, CommentRow } from "@/lib/types/comment";
import type { PostRow } from "@/lib/types/post";

type JoinRow = PostRow & {
  author_username: string;
  author_avatar_url: string;
  likes_count: number;
  liked_by_me: boolean;
  comments: unknown;
  tags: unknown;
  has_media?: boolean;
};

function rowToClientPost(row: JoinRow, opts?: { feedMedia?: boolean }): ClientPost {
  const post = mapPostRow(row);
  const feedMedia = opts?.feedMedia ? parseFeedMediaJson(row.media) : undefined;
  const apiPost = feedMedia ? { ...post, media: feedMedia } : post;

  return mapPostForClient(apiPost, {
    authorUsername: row.author_username,
    authorAvatarUrl: row.author_avatar_url,
    comments: normalizeCommentsJson(row.comments),
    likesCount: Number(row.likes_count) || 0,
    likedByMe: Boolean(row.liked_by_me),
    hasMedia: Boolean(row.has_media),
  });
}

/** Feed paginado; media = solo rutas `/uploads/posts/...`. */
export async function listPostsForFeed(
  viewerUserId: string | null | undefined,
  fetchLimit: number
): Promise<ClientPost[]> {
  const page = await listPostsForFeedPage(viewerUserId, "all", {
    limit: fetchLimit,
    cursor: null,
  });
  return page.posts;
}

export type FeedPostsPageResult = {
  posts: ClientPost[];
  nextCursor: string | null;
  hasMore: boolean;
};

/** Feed con cursor; el filtro `scope` se aplica tras la consulta SQL. */
export async function listPostsForFeedPage(
  viewerUserId: string | null | undefined,
  scope: "all" | "following",
  opts: { limit: number; cursor?: string | null }
): Promise<FeedPostsPageResult> {
  const limit = Math.min(Math.max(opts.limit, 1), 50);
  const rawLimit = Math.min(limit * 3, 80);

  const params: unknown[] = [viewerUserId ?? null];
  let cursorClause = "";
  const decoded = opts.cursor ? decodePostCursor(opts.cursor) : null;
  if (decoded) {
    params.push(decoded.createdAt, decoded.id);
    cursorClause = `AND (p.created_at, p.id) < ($${params.length - 1}::timestamptz, $${params.length}::uuid)`;
  }
  params.push(rawLimit + 1);

  const sql = buildListPostsFeedPageSql(cursorClause, params.length);

  const rows = await query<JoinRow>(sql, params);
  const batch = await enrichPostsWithSessionMeta(
    rows.map((row) => rowToClientPost(row, { feedMedia: true }))
  );
  const visible = await filterPostsForFeed(batch, viewerUserId, scope);
  const hasMore = visible.length > limit || rows.length > rawLimit;
  const posts = visible.slice(0, limit);
  const nextCursor =
    hasMore && posts.length > 0 ? cursorFromClientPost(posts[posts.length - 1]!) : null;

  return { posts, nextCursor, hasMore };
}

/** Posts visibles para el viewer (perfil / paginación). */
function postVisibilitySql(viewerParam: string, profileUserParam = "$1"): string {
  return `(
    ${viewerParam}::uuid IS NOT NULL
    AND ${profileUserParam}::uuid = ${viewerParam}::uuid
    OR p.visibility = 'public'
    OR (
      ${viewerParam}::uuid IS NOT NULL
      AND p.visibility = 'followers'
      AND EXISTS (
        SELECT 1 FROM follows f
        WHERE f.follower_id = ${viewerParam}::uuid
          AND f.following_id = ${profileUserParam}::uuid
          AND f.status = 'active'
      )
    )
  )`;
}

export async function countPostsByUser(userId: string): Promise<number> {
  const rows = await query<{ c: number }>(
    `SELECT COUNT(*)::int AS c FROM posts WHERE user_id = $1::uuid`,
    [userId]
  );
  return rows[0]?.c ?? 0;
}

export async function countVisiblePostsByUser(
  userId: string,
  viewerUserId: string | null | undefined
): Promise<number> {
  const viewer = viewerUserId ?? null;
  if (viewer === userId) return countPostsByUser(userId);
  const rows = await query<{ c: number }>(
    `SELECT COUNT(*)::int AS c
     FROM posts p
     WHERE p.user_id = $1::uuid AND ${postVisibilitySql("$2")}`,
    [userId, viewer]
  );
  return rows[0]?.c ?? 0;
}

export type PostsByUserPageResult = {
  posts: ClientPost[];
  nextCursor: string | null;
  total: number;
};

/** Perfil: página en SQL (sin cargar todas las publicaciones). */
export async function listPostsByUserPageForClient(
  userId: string,
  viewerUserId: string | null | undefined,
  opts: { limit: number; cursor?: string | null; grid?: boolean }
): Promise<PostsByUserPageResult> {
  const limit = Math.min(Math.max(opts.limit, 1), 50);
  const viewer = viewerUserId ?? null;
  const total = await countVisiblePostsByUser(userId, viewer);

  const params: unknown[] = [userId, viewer];
  const visibility =
    viewer === userId ? "" : `AND ${postVisibilitySql("$2")}`;
  let cursorClause = "";
  const decoded = opts.cursor ? decodePostCursor(opts.cursor) : null;
  if (decoded) {
    params.push(decoded.createdAt, decoded.id);
    cursorClause = `AND (p.created_at, p.id) < ($${params.length - 1}::timestamptz, $${params.length}::uuid)`;
  }
  params.push(limit + 1);

  const baseSql = opts.grid ? LIST_POSTS_BY_USER_GRID_SQL : LIST_POSTS_BY_USER_SQL;
  const sql = `
${baseSql}
${visibility}
${cursorClause}
ORDER BY p.created_at DESC, p.id DESC
LIMIT $${params.length}`;

  const rows = await query<JoinRow>(sql, params);
  const hasMore = rows.length > limit;
  const slice = hasMore ? rows.slice(0, limit) : rows;
  const posts = await enrichPostsWithSessionMeta(slice.map((row) => rowToClientPost(row)));
  const nextCursor =
    hasMore && posts.length > 0 ? cursorFromClientPost(posts[posts.length - 1]!) : null;

  return { posts, nextCursor, total };
}

/** Listado completo (evitar en rutas de perfil). */
export async function listPostsByUserForClient(
  userId: string,
  viewerUserId?: string | null
): Promise<ClientPost[]> {
  const page = await listPostsByUserPageForClient(userId, viewerUserId, { limit: 500 });
  return page.posts;
}

export async function getPostForClient(
  postId: string,
  viewerUserId?: string | null
): Promise<ClientPost | null> {
  const rows = await query<JoinRow>(GET_POST_WITH_RELATIONS_SQL, [viewerUserId ?? null, postId]);
  const row = rows[0];
  if (!row) return null;
  const [enriched] = await enrichPostsWithSessionMeta([rowToClientPost(row)]);
  return enriched ?? null;
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
