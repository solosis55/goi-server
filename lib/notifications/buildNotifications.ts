import { query } from "@/lib/db";
import type { FeedNotification } from "@/lib/types/notifications";

const POST_PREVIEW_SQL = `
  CASE
    WHEN TRIM(p.content) <> '' THEN LEFT(TRIM(p.content), 96)
    WHEN p.media IS NOT NULL AND jsonb_array_length(p.media) > 0 THEN 'Publicación con foto'
    ELSE ''
  END`;

type LikeRow = {
  id: string;
  actor_user_id: string;
  actor_username: string;
  actor_avatar_url: string;
  post_id: string;
  post_preview: string;
  created_at: string;
};

type CommentRow = {
  id: string;
  actor_user_id: string;
  actor_username: string;
  actor_avatar_url: string;
  post_id: string;
  post_preview: string;
  comment_preview: string;
  comment_id: string;
  created_at: string;
};

type FollowRow = {
  id: string;
  actor_user_id: string;
  actor_username: string;
  actor_avatar_url: string;
  created_at: string;
};

export async function buildNotificationsForRecipient(
  recipientId: string
): Promise<FeedNotification[]> {
  const likes = await query<LikeRow>(
    `SELECT
       ('like:' || pl.id) AS id,
       pl.user_id AS actor_user_id,
       u.username AS actor_username,
       u.avatar_url AS actor_avatar_url,
       pl.post_id,
       ${POST_PREVIEW_SQL} AS post_preview,
       pl.created_at
     FROM post_likes pl
     INNER JOIN posts p ON p.id = pl.post_id
     INNER JOIN users u ON u.id = pl.user_id
     WHERE p.user_id = $1 AND pl.user_id <> $1`,
    [recipientId]
  );

  const comments = await query<CommentRow>(
    `SELECT
       ('comment:' || pc.id) AS id,
       pc.user_id AS actor_user_id,
       u.username AS actor_username,
       u.avatar_url AS actor_avatar_url,
       pc.post_id,
       ${POST_PREVIEW_SQL} AS post_preview,
       LEFT(pc.content, 120) AS comment_preview,
       pc.id AS comment_id,
       pc.created_at
     FROM post_comments pc
     INNER JOIN posts p ON p.id = pc.post_id
     INNER JOIN users u ON u.id = pc.user_id
     WHERE p.user_id = $1 AND pc.user_id <> $1`,
    [recipientId]
  );

  const follows = await query<FollowRow>(
    `SELECT
       ('follow:' || f.id) AS id,
       f.follower_id AS actor_user_id,
       u.username AS actor_username,
       u.avatar_url AS actor_avatar_url,
       f.created_at
     FROM follows f
     INNER JOIN users u ON u.id = f.follower_id
     WHERE f.following_id = $1 AND f.follower_id <> $1 AND f.status = 'active'`,
    [recipientId]
  );

  const notifications: FeedNotification[] = [
    ...likes.map((r) => ({
      id: r.id,
      type: "like" as const,
      actorUserId: r.actor_user_id,
      actorUsername: r.actor_username ?? "Usuario",
      actorAvatarUrl: r.actor_avatar_url ?? "",
      postId: r.post_id,
      postPreview: r.post_preview ?? "",
      createdAt: r.created_at,
    })),
    ...comments.map((r) => ({
      id: r.id,
      type: "comment" as const,
      actorUserId: r.actor_user_id,
      actorUsername: r.actor_username ?? "Usuario",
      actorAvatarUrl: r.actor_avatar_url ?? "",
      postId: r.post_id,
      postPreview: r.post_preview ?? "",
      commentPreview: r.comment_preview ?? "",
      commentId: r.comment_id,
      createdAt: r.created_at,
    })),
    ...follows.map((r) => ({
      id: r.id,
      type: "follow" as const,
      actorUserId: r.actor_user_id,
      actorUsername: r.actor_username ?? "Usuario",
      actorAvatarUrl: r.actor_avatar_url ?? "",
      createdAt: r.created_at,
    })),
  ];

  return notifications
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 50);
}
