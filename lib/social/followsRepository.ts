import { query } from "@/lib/db";

export type FollowStatus = "active" | "pending";

export type ToggleFollowResult = {
  following: boolean;
  pending: boolean;
  status: "none" | "pending" | "active";
};

export async function isActiveFollowing(
  followerId: string,
  followingId: string
): Promise<boolean> {
  const rows = await query<{ ok: number }>(
    `SELECT 1 AS ok FROM follows
     WHERE follower_id = $1 AND following_id = $2 AND status = 'active'`,
    [followerId, followingId]
  );
  return Boolean(rows[0]);
}

export async function getFollowingIds(userId: string): Promise<string[]> {
  const rows = await query<{ following_id: string }>(
    `SELECT following_id FROM follows WHERE follower_id = $1`,
    [userId]
  );
  return rows.map((r) => r.following_id);
}

export async function getActiveFollowingIds(userId: string): Promise<string[]> {
  const rows = await query<{ following_id: string }>(
    `SELECT following_id FROM follows
     WHERE follower_id = $1 AND status = 'active'`,
    [userId]
  );
  return rows.map((r) => r.following_id);
}

export async function getFollowerIds(userId: string): Promise<string[]> {
  const rows = await query<{ follower_id: string }>(
    `SELECT follower_id FROM follows
     WHERE following_id = $1 AND status = 'active'`,
    [userId]
  );
  return rows.map((r) => r.follower_id);
}

export async function countFollowers(userId: string): Promise<number> {
  const rows = await query<{ c: number }>(
    `SELECT COUNT(*)::int AS c FROM follows
     WHERE following_id = $1 AND status = 'active'`,
    [userId]
  );
  return rows[0]?.c ?? 0;
}

export type MutualPreviewRow = {
  id: string;
  username: string;
  avatar_url: string;
};

/** Seguidores en común (SQL, sin cargar listas enteras). */
export async function listMutualFollowerPreviews(
  viewerId: string,
  targetUserId: string,
  limit = 5
): Promise<MutualPreviewRow[]> {
  const cap = Math.min(Math.max(limit, 1), 20);
  return query<MutualPreviewRow>(
    `SELECT u.id, u.username, u.avatar_url
     FROM follows mine
     INNER JOIN follows theirs
       ON theirs.follower_id = mine.following_id
      AND theirs.following_id = $2::uuid
      AND theirs.status = 'active'
     INNER JOIN users u ON u.id = mine.following_id
     WHERE mine.follower_id = $1::uuid
       AND mine.status = 'active'
       AND mine.following_id <> $2::uuid
     LIMIT $3`,
    [viewerId, targetUserId, cap]
  );
}

export async function countActiveFollowing(userId: string): Promise<number> {
  const rows = await query<{ c: number }>(
    `SELECT COUNT(*)::int AS c FROM follows
     WHERE follower_id = $1 AND status = 'active'`,
    [userId]
  );
  return rows[0]?.c ?? 0;
}

export async function activeFollowingSetForViewer(viewerId: string): Promise<Set<string>> {
  const ids = await getActiveFollowingIds(viewerId);
  return new Set([viewerId, ...ids]);
}

export async function toggleFollow(
  followerId: string,
  targetUserId: string,
  targetProfileVisibility: string
): Promise<ToggleFollowResult> {
  const existing = await query<{ id: string; status: FollowStatus }>(
    `SELECT id, status FROM follows
     WHERE follower_id = $1 AND following_id = $2`,
    [followerId, targetUserId]
  );

  if (existing[0]) {
    await query(`DELETE FROM follows WHERE id = $1`, [existing[0].id]);
    return { following: false, pending: false, status: "none" };
  }

  const needsApproval = targetProfileVisibility === "request";
  const status: FollowStatus = needsApproval ? "pending" : "active";

  await query(
    `INSERT INTO follows (id, follower_id, following_id, status, created_at)
     VALUES ($1, $2, $3, $4, NOW())`,
    [crypto.randomUUID(), followerId, targetUserId, status]
  );

  if (needsApproval) {
    return { following: false, pending: true, status: "pending" };
  }
  return { following: true, pending: false, status: "active" };
}

export async function getFollowStatus(
  followerId: string,
  followingId: string
): Promise<"none" | "pending" | "active"> {
  const rows = await query<{ status: FollowStatus }>(
    `SELECT status FROM follows WHERE follower_id = $1 AND following_id = $2`,
    [followerId, followingId]
  );
  if (!rows[0]) return "none";
  return rows[0].status === "pending" ? "pending" : "active";
}

/** Todas las relaciones que el viewer sigue (o pidió), en una sola query. */
export async function getOutgoingFollowStatusMap(
  viewerId: string
): Promise<Map<string, "pending" | "active">> {
  const rows = await query<{ following_id: string; status: FollowStatus }>(
    `SELECT following_id, status FROM follows WHERE follower_id = $1`,
    [viewerId]
  );
  const map = new Map<string, "pending" | "active">();
  for (const r of rows) {
    if (r.status === "pending" || r.status === "active") {
      map.set(r.following_id, r.status);
    }
  }
  return map;
}

/** Quién sigue al viewer con follow activo. */
export async function getIncomingActiveFollowerSet(viewerId: string): Promise<Set<string>> {
  const rows = await query<{ follower_id: string }>(
    `SELECT follower_id FROM follows
     WHERE following_id = $1 AND status = 'active'`,
    [viewerId]
  );
  return new Set(rows.map((r) => r.follower_id));
}

export type SocialPreviewRow = {
  id: string;
  username: string;
  avatarUrl: string;
  isFollowing: boolean;
  followsYou: boolean;
};

export async function mapSocialPreviews(
  viewerId: string,
  userIds: string[]
): Promise<SocialPreviewRow[]> {
  if (userIds.length === 0) return [];
  const users = await query<{ id: string; username: string; avatar_url: string }>(
    `SELECT id, username, avatar_url FROM users WHERE id = ANY($1::uuid[])`,
    [userIds]
  );
  const outgoing = await getOutgoingFollowStatusMap(viewerId);
  const incoming = await getIncomingActiveFollowerSet(viewerId);
  const byId = new Map(users.map((u) => [u.id, u]));
  return userIds
    .map((id) => {
      const u = byId.get(id);
      if (!u) return null;
      const out = outgoing.get(id);
      return {
        id: u.id,
        username: u.username,
        avatarUrl: u.avatar_url ?? "",
        isFollowing: out === "active",
        followsYou: incoming.has(id),
      };
    })
    .filter((p): p is SocialPreviewRow => p != null);
}

export type FollowRequestPreview = {
  requesterId: string;
  username: string;
  avatarUrl: string;
  createdAt: string;
};

export type SentFollowRequestPreview = {
  targetUserId: string;
  username: string;
  avatarUrl: string;
  createdAt: string;
};

export async function listPendingIncomingRequests(
  userId: string
): Promise<FollowRequestPreview[]> {
  const rows = await query<{
    follower_id: string;
    created_at: string;
    username: string;
    avatar_url: string;
  }>(
    `SELECT f.follower_id, f.created_at::text,
            u.username, u.avatar_url
     FROM follows f
     JOIN users u ON u.id = f.follower_id
     WHERE f.following_id = $1 AND f.status = 'pending'
     ORDER BY f.created_at DESC`,
    [userId]
  );
  return rows.map((r) => ({
    requesterId: r.follower_id,
    username: r.username ?? "Usuario",
    avatarUrl: r.avatar_url ?? "",
    createdAt: r.created_at,
  }));
}

export async function listPendingSentRequests(
  userId: string
): Promise<SentFollowRequestPreview[]> {
  const rows = await query<{
    following_id: string;
    created_at: string;
    username: string;
    avatar_url: string;
  }>(
    `SELECT f.following_id, f.created_at::text,
            u.username, u.avatar_url
     FROM follows f
     JOIN users u ON u.id = f.following_id
     WHERE f.follower_id = $1 AND f.status = 'pending'
     ORDER BY f.created_at DESC`,
    [userId]
  );
  return rows.map((r) => ({
    targetUserId: r.following_id,
    username: r.username ?? "Usuario",
    avatarUrl: r.avatar_url ?? "",
    createdAt: r.created_at,
  }));
}

export async function respondFollowRequest(
  ownerId: string,
  requesterId: string,
  action: "accept" | "reject"
): Promise<boolean> {
  if (action === "reject") {
    const deleted = await query<{ id: string }>(
      `DELETE FROM follows
       WHERE follower_id = $1 AND following_id = $2 AND status = 'pending'
       RETURNING id`,
      [requesterId, ownerId]
    );
    return Boolean(deleted[0]);
  }
  const rows = await query<{ id: string }>(
    `UPDATE follows SET status = 'active'
     WHERE follower_id = $1 AND following_id = $2 AND status = 'pending'
     RETURNING id`,
    [requesterId, ownerId]
  );
  return Boolean(rows[0]);
}

export async function mapSocialPreview(viewerId: string, userId: string) {
  const rows = await mapSocialPreviews(viewerId, [userId]);
  return rows[0] ?? null;
}
