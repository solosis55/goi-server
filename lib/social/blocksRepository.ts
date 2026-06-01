import { query } from "@/lib/db";

export async function getBlockedIdsForUser(blockerId: string): Promise<string[]> {
  const rows = await query<{ blocked_id: string }>(
    `SELECT blocked_id FROM user_blocks WHERE blocker_id = $1`,
    [blockerId]
  );
  return rows.map((r) => r.blocked_id);
}

export async function isBlockedBetween(a: string, b: string): Promise<boolean> {
  if (!a || !b) return false;
  const rows = await query<{ ok: number }>(
    `SELECT 1 AS ok FROM user_blocks
     WHERE (blocker_id = $1 AND blocked_id = $2)
        OR (blocker_id = $2 AND blocked_id = $1)
     LIMIT 1`,
    [a, b]
  );
  return Boolean(rows[0]);
}

export async function toggleBlock(
  blockerId: string,
  blockedId: string
): Promise<{ blocked: boolean }> {
  const existing = await query<{ id: string }>(
    `SELECT id FROM user_blocks WHERE blocker_id = $1 AND blocked_id = $2`,
    [blockerId, blockedId]
  );
  if (existing[0]) {
    await query(`DELETE FROM user_blocks WHERE id = $1`, [existing[0].id]);
    return { blocked: false };
  }

  await query(
    `DELETE FROM follows
     WHERE (follower_id = $1 AND following_id = $2)
        OR (follower_id = $2 AND following_id = $1)`,
    [blockerId, blockedId]
  );

  await query(
    `INSERT INTO user_blocks (id, blocker_id, blocked_id, created_at)
     VALUES ($1, $2, $3, NOW())`,
    [crypto.randomUUID(), blockerId, blockedId]
  );
  return { blocked: true };
}
