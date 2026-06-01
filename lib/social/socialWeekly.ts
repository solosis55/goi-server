import { query } from "@/lib/db";
import { getActiveFollowingIds } from "@/lib/social/followsRepository";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export type WeeklyLeaderDto = {
  userId: string;
  username: string;
  avatarUrl: string;
  sessionsThisWeek: number;
};

export type SocialWeeklySummary = {
  mySessionsWeek: number;
  followingActiveWeek: number;
  leaders: WeeklyLeaderDto[];
};

async function sessionsThisWeekByUser(nowMs: number): Promise<Map<string, number>> {
  const cutoff = new Date(nowMs - WEEK_MS).toISOString();
  const rows = await query<{ user_id: string; cnt: string }>(
    `SELECT user_id, COUNT(*)::text AS cnt
     FROM workout_sessions
     WHERE performed_at >= $1::timestamptz
     GROUP BY user_id`,
    [cutoff]
  );
  const map = new Map<string, number>();
  for (const r of rows) {
    map.set(r.user_id, Number(r.cnt) || 0);
  }
  return map;
}

async function activeUserIdsThisWeek(nowMs: number): Promise<Set<string>> {
  const cutoff = new Date(nowMs - WEEK_MS).toISOString();
  const [posts, sessions] = await Promise.all([
    query<{ user_id: string }>(
      `SELECT DISTINCT user_id FROM posts WHERE created_at >= $1::timestamptz`,
      [cutoff]
    ),
    query<{ user_id: string }>(
      `SELECT DISTINCT user_id FROM workout_sessions WHERE performed_at >= $1::timestamptz`,
      [cutoff]
    ),
  ]);
  const set = new Set<string>();
  for (const p of posts) set.add(p.user_id);
  for (const s of sessions) set.add(s.user_id);
  return set;
}

export async function buildSocialWeeklySummary(viewerId: string): Promise<SocialWeeklySummary> {
  const nowMs = Date.now();
  const sessionCounts = await sessionsThisWeekByUser(nowMs);
  const activeIds = await activeUserIdsThisWeek(nowMs);
  const mySessionsWeek = sessionCounts.get(viewerId) ?? 0;

  const followingIds = await getActiveFollowingIds(viewerId);
  let followingActiveWeek = 0;
  const leaders: WeeklyLeaderDto[] = [];

  if (followingIds.length > 0) {
    const userRows = await query<{
      id: string;
      username: string;
      avatar_url: string;
    }>(
      `SELECT id, username, avatar_url FROM users WHERE id = ANY($1::uuid[])`,
      [followingIds]
    );
    const userMap = new Map(userRows.map((u) => [u.id, u]));

    for (const fid of followingIds) {
      if (activeIds.has(fid)) followingActiveWeek += 1;
      const count = sessionCounts.get(fid) ?? 0;
      if (count <= 0) continue;
      const u = userMap.get(fid);
      if (!u) continue;
      leaders.push({
        userId: u.id,
        username: u.username,
        avatarUrl: u.avatar_url ?? "",
        sessionsThisWeek: count,
      });
    }
  }

  leaders.sort((a, b) => b.sessionsThisWeek - a.sessionsThisWeek);

  return {
    mySessionsWeek,
    followingActiveWeek,
    leaders: leaders.slice(0, 8),
  };
}
