import { query } from "@/lib/db";

export type PostLikeRow = {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
};

export type PostLikeListEntry = {
  id: string;
  username: string;
  avatarUrl: string;
  likedAt: string;
};

export async function togglePostLike(
  postId: string,
  userId: string
): Promise<{ liked: boolean }> {
  const existing = await query<PostLikeRow>(
    `SELECT id FROM post_likes WHERE post_id = $1 AND user_id = $2`,
    [postId, userId]
  );

  if (existing[0]) {
    await query(`DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2`, [postId, userId]);
    return { liked: false };
  }

  await query(
    `INSERT INTO post_likes (id, post_id, user_id, created_at)
     VALUES ($1, $2, $3, NOW())`,
    [crypto.randomUUID(), postId, userId]
  );
  return { liked: true };
}

export async function listPostLikesForClient(postId: string): Promise<{
  likes: PostLikeListEntry[];
  total: number;
}> {
  const rows = await query<{
    user_id: string;
    username: string;
    avatar_url: string;
    created_at: string;
  }>(
    `SELECT pl.user_id, u.username, u.avatar_url, pl.created_at
     FROM post_likes pl
     INNER JOIN users u ON u.id = pl.user_id
     WHERE pl.post_id = $1
     ORDER BY pl.created_at DESC`,
    [postId]
  );

  const likes = rows.map((r) => ({
    id: r.user_id,
    username: r.username,
    avatarUrl: r.avatar_url ?? "",
    likedAt: r.created_at,
  }));

  return { likes, total: likes.length };
}
