import { query } from "@/lib/db";

export async function getReadKeysForUser(userId: string): Promise<Set<string>> {
  const rows = await query<{ notification_key: string }>(
    `SELECT notification_key FROM notification_reads WHERE user_id = $1`,
    [userId]
  );
  return new Set(rows.map((r) => r.notification_key));
}

export async function markNotificationsRead(
  userId: string,
  keys: string[]
): Promise<number> {
  if (keys.length === 0) return 0;

  let marked = 0;
  for (const key of keys) {
    const rows = await query<{ notification_key: string }>(
      `INSERT INTO notification_reads (user_id, notification_key, read_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id, notification_key) DO NOTHING
       RETURNING notification_key`,
      [userId, key]
    );
    if (rows[0]) marked += 1;
  }
  return marked;
}
