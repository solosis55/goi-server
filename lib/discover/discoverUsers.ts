import { query } from "@/lib/db";
import { isNearbyMatch } from "@/lib/geo/nearby";
import { isProfileDiscoverable } from "@/lib/discover/profileVisibility";
import type { UserRow } from "@/lib/users/types";
import { findUserById } from "@/lib/users/repository";

export type DiscoverMutualPreview = {
  id: string;
  username: string;
  avatarUrl: string;
};

export type RankedDiscoverUser = {
  user: UserRow;
  score: number;
  mutualCount: number;
  mutualPreview: DiscoverMutualPreview[];
  reason: string;
  activeThisWeek: boolean;
  trainedThisWeek: boolean;
  /** Distancia en km si ambos tienen GPS; null si solo coincide texto. */
  distanceKm: number | null;
  nearby: boolean;
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

type DiscoverContext = {
  viewerFollowing: Set<string>;
  allFollows: { follower_id: string; following_id: string; status: string }[];
  activePostUserIds: Set<string>;
  activeSessionUserIds: Set<string>;
  trainedUserIds: Set<string>;
  viewerWorkoutIds: Set<string>;
  sessionsByUser: Map<string, Set<string>>;
  usersById: Map<string, UserRow>;
};

async function loadDiscoverContext(viewerId: string): Promise<DiscoverContext | null> {
  const viewer = await findUserById(viewerId);
  if (!viewer) return null;

  const cutoff = new Date(Date.now() - WEEK_MS).toISOString();

  const [followRows, postRows, sessionRows, allUsers] = await Promise.all([
    query<{ follower_id: string; following_id: string; status: string }>(
      `SELECT follower_id, following_id, status FROM follows`
    ),
    query<{ user_id: string }>(
      `SELECT DISTINCT user_id FROM posts WHERE created_at >= $1::timestamptz`,
      [cutoff]
    ),
    query<{ user_id: string; workout_id: string }>(
      `SELECT user_id, workout_id FROM workout_sessions WHERE performed_at >= $1::timestamptz`,
      [cutoff]
    ),
    query<UserRow>(
      `SELECT id, username, '' AS email, '' AS password_hash, bio, goal, avatar_url,
              banner_url, banner_show_in_feed, website_url, instagram_url, strava_url,
              location, latitude, longitude, location_updated_at,
              profile_visibility, pinned_post_id,
              COALESCE(discoverable, TRUE) AS discoverable,
              COALESCE(notification_prefs, '{"mutedTypes":[]}'::jsonb) AS notification_prefs,
              created_at::text, updated_at::text
       FROM users WHERE id != $1`,
      [viewerId]
    ),
  ]);

  const viewerFollowing = new Set(
    followRows.filter((f) => f.follower_id === viewerId).map((f) => f.following_id)
  );

  const activePostUserIds = new Set(postRows.map((p) => p.user_id));
  const activeSessionUserIds = new Set(sessionRows.map((s) => s.user_id));
  const trainedUserIds = new Set(sessionRows.map((s) => s.user_id));

  const viewerWorkoutIds = new Set(
    sessionRows.filter((s) => s.user_id === viewerId).map((s) => s.workout_id)
  );

  const sessionsByUser = new Map<string, Set<string>>();
  for (const s of sessionRows) {
    const set = sessionsByUser.get(s.user_id) ?? new Set();
    set.add(s.workout_id);
    sessionsByUser.set(s.user_id, set);
  }

  const usersById = new Map(allUsers.map((u) => [u.id, u]));

  return {
    viewerFollowing,
    allFollows: followRows,
    activePostUserIds,
    activeSessionUserIds,
    trainedUserIds,
    viewerWorkoutIds,
    sessionsByUser,
    usersById,
  };
}

function norm(value: string | undefined | null): string {
  return (value ?? "").trim().toLowerCase();
}

function isActiveThisWeek(ctx: DiscoverContext, userId: string): boolean {
  return ctx.activePostUserIds.has(userId) || ctx.activeSessionUserIds.has(userId);
}

function trainedThisWeek(ctx: DiscoverContext, userId: string): boolean {
  return ctx.trainedUserIds.has(userId);
}

function sharedWorkoutCount(ctx: DiscoverContext, candidateId: string): number {
  if (ctx.viewerWorkoutIds.size === 0) return 0;
  const candidateIds = ctx.sessionsByUser.get(candidateId);
  if (!candidateIds) return 0;
  let n = 0;
  for (const id of ctx.viewerWorkoutIds) {
    if (candidateIds.has(id)) n += 1;
  }
  return n;
}

function mutualsForTarget(
  ctx: DiscoverContext,
  targetId: string
): string[] {
  const ids: string[] = [];
  for (const follow of ctx.allFollows) {
    if (follow.following_id !== targetId) continue;
    if (follow.status === "pending") continue;
    if (ctx.viewerFollowing.has(follow.follower_id)) ids.push(follow.follower_id);
  }
  return ids;
}

function nearbyReasonLabel(distanceKm: number | null): string {
  if (distanceKm == null) return "Cerca de ti";
  if (distanceKm < 1) return "A menos de 1 km";
  return `A ${Math.round(distanceKm)} km`;
}

function buildReason(input: {
  mutualCount: number;
  sameGoal: boolean;
  nearby: boolean;
  nearbyDistanceKm: number | null;
  activeThisWeek: boolean;
  trainedThisWeek: boolean;
  sharedWorkouts: number;
  goal: string;
  bio: string;
}): string {
  if (input.mutualCount > 0) {
    return input.mutualCount === 1 ? "1 contacto en común" : `${input.mutualCount} contactos en común`;
  }
  if (input.sharedWorkouts > 0) {
    return input.sharedWorkouts === 1
      ? "Entrena la misma rutina que tú"
      : "Rutinas en común contigo";
  }
  if (input.trainedThisWeek) return "Entrenó esta semana";
  if (input.sameGoal && input.goal) return input.goal;
  if (input.nearby) return nearbyReasonLabel(input.nearbyDistanceKm);
  if (input.activeThisWeek) return "Activo esta semana";
  if (input.goal) return input.goal;
  if (input.bio) return input.bio;
  return "Perfil en GoI";
}

function rankOne(viewer: UserRow, ctx: DiscoverContext): RankedDiscoverUser[] {
  const viewerGoal = norm(viewer.goal);
  const ranked: RankedDiscoverUser[] = [];

  for (const candidate of ctx.usersById.values()) {
    if (candidate.id === viewer.id) continue;
    if (ctx.viewerFollowing.has(candidate.id)) continue;
    if (!isProfileDiscoverable(candidate)) continue;

    const mutualIds = mutualsForTarget(ctx, candidate.id);
    const mutualCount = mutualIds.length;
    const sameGoal = viewerGoal.length > 0 && viewerGoal === norm(candidate.goal);
    const nearbyMatch = isNearbyMatch(viewer, candidate);
    const active = isActiveThisWeek(ctx, candidate.id);
    const trained = trainedThisWeek(ctx, candidate.id);
    const sharedWorkouts = sharedWorkoutCount(ctx, candidate.id);

    let score = 0;
    score += mutualCount * 12;
    if (sharedWorkouts > 0) score += 10;
    if (trained) score += 7;
    if (sameGoal) score += 8;
    if (nearbyMatch.nearby) score += nearbyMatch.distanceKm != null ? 8 : 5;
    if (active) score += 6;

    const mutualPreview: DiscoverMutualPreview[] = mutualIds.slice(0, 2).map((id) => {
      const u = ctx.usersById.get(id)!;
      return { id: u.id, username: u.username, avatarUrl: u.avatar_url ?? "" };
    });

    const goal = (candidate.goal ?? "").trim();
    const bio = (candidate.bio ?? "").trim();
    const reason = buildReason({
      mutualCount,
      sameGoal,
      nearby: nearbyMatch.nearby,
      nearbyDistanceKm: nearbyMatch.distanceKm,
      activeThisWeek: active,
      trainedThisWeek: trained,
      sharedWorkouts,
      goal,
      bio,
    });

    ranked.push({
      user: candidate,
      score,
      mutualCount,
      mutualPreview,
      reason,
      activeThisWeek: active,
      trainedThisWeek: trained,
      distanceKm: nearbyMatch.distanceKm,
      nearby: nearbyMatch.nearby,
    });
  }

  ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.user.username.localeCompare(b.user.username);
  });

  return ranked;
}

export async function rankAllDiscoverUsers(viewerId: string): Promise<RankedDiscoverUser[]> {
  const ctx = await loadDiscoverContext(viewerId);
  if (!ctx) return [];
  const viewer = await findUserById(viewerId);
  if (!viewer) return [];
  return rankOne(viewer, ctx);
}

/** Contexto + ranking en una pasada (evita doble findUserById). */
export async function rankDiscoverUsersOptimized(
  viewerId: string,
  limit = 24
): Promise<{ ranked: RankedDiscoverUser[]; viewer: UserRow | null }> {
  const viewer = await findUserById(viewerId);
  if (!viewer) return { ranked: [], viewer: null };
  const ctx = await loadDiscoverContext(viewerId);
  if (!ctx) return { ranked: [], viewer };
  return { ranked: rankOne(viewer, ctx).slice(0, limit), viewer };
}
