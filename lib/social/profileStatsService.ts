import { query } from "@/lib/db";
import { countActiveFollowing, countFollowers } from "@/lib/social/followsRepository";
import { listSessionsForUser } from "@/lib/workouts/sessionsRepository";

export type ProfileStatsResponse = {
  followersCount: number;
  followingCount: number;
  routinesCount: number;
  totalSessions: number;
  sessionsThisWeek: number;
  lastSession: { performedAt: string; workoutId: string; workoutTitle: string } | null;
  recentRoutineTitles: string[];
  streakWeeks: number;
  sparklineCounts: number[];
};

function countSessionsInRollingWeek(performedAts: string[]): number {
  const now = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  return performedAts.filter((iso) => {
    const t = Date.parse(iso);
    return Number.isFinite(t) && now - t <= weekMs;
  }).length;
}

function sessionsPerDayLast7(performedAts: string[]): number[] {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  const now = new Date();
  for (const iso of performedAts) {
    const t = Date.parse(iso);
    if (!Number.isFinite(t)) continue;
    const d = new Date(t);
    const dayDiff = Math.floor(
      (Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) -
        Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())) /
        (24 * 60 * 60 * 1000)
    );
    if (dayDiff >= 0 && dayDiff < 7) counts[6 - dayDiff] += 1;
  }
  return counts;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function startOfLocalDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function computeStreakWeeks(performedMs: number[]): number {
  if (performedMs.length === 0) return 0;
  const weekStarts = new Set<number>();
  for (const t of performedMs) {
    if (!Number.isFinite(t)) continue;
    const d = new Date(t);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const diffToMonday = (day + 6) % 7;
    d.setDate(d.getDate() - diffToMonday);
    weekStarts.add(d.getTime());
  }
  const now = Date.now();
  const today = new Date(startOfLocalDay(now));
  const day = today.getDay();
  const diffToMonday = (day + 6) % 7;
  today.setDate(today.getDate() - diffToMonday);
  let cursor = today.getTime();
  let streak = 0;
  while (weekStarts.has(cursor)) {
    streak += 1;
    cursor -= WEEK_MS;
  }
  return streak;
}

/** Estadísticas ligeras del perfil propio (una sola petición). */
export async function getProfileStats(userId: string): Promise<ProfileStatsResponse> {
  const [followersCount, followingCount, routinesCount, sessions, workoutRows] = await Promise.all([
    countFollowers(userId),
    countActiveFollowing(userId),
    query<{ c: number }>(
      `SELECT COUNT(*)::int AS c FROM workouts WHERE user_id = $1::uuid`,
      [userId]
    ).then((r) => r[0]?.c ?? 0),
    listSessionsForUser(userId),
    query<{ id: string; title: string }>(
      `SELECT id, title FROM workouts WHERE user_id = $1::uuid`,
      [userId]
    ),
  ]);

  const titleById = new Map(workoutRows.map((w) => [w.id, w.title]));
  const performedAts = sessions.map((s) => s.performedAt);
  const performedMs = performedAts.map((iso) => Date.parse(iso)).filter(Number.isFinite);
  const sorted = [...sessions].sort((a, b) => (a.performedAt < b.performedAt ? 1 : -1));
  const latest = sorted[0];

  const seen = new Set<string>();
  const recentRoutineTitles: string[] = [];
  for (const s of sorted) {
    if (!s.workoutId || seen.has(s.workoutId)) continue;
    seen.add(s.workoutId);
    recentRoutineTitles.push(titleById.get(s.workoutId) ?? s.workoutTitle ?? "Rutina");
    if (recentRoutineTitles.length >= 3) break;
  }

  return {
    followersCount,
    followingCount,
    routinesCount,
    totalSessions: sessions.length,
    sessionsThisWeek: countSessionsInRollingWeek(performedAts),
    lastSession: latest
      ? {
          performedAt: latest.performedAt,
          workoutId: latest.workoutId,
          workoutTitle: titleById.get(latest.workoutId) ?? latest.workoutTitle ?? "Rutina",
        }
      : null,
    recentRoutineTitles,
    streakWeeks: computeStreakWeeks(performedMs),
    sparklineCounts: sessionsPerDayLast7(performedAts),
  };
}
