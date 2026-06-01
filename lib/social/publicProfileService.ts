import { query } from "@/lib/db";
import {
  countPostsByUser,
  countVisiblePostsByUser,
  listPostsByUserPageForClient,
} from "@/lib/posts/listPostsWithRelations";
import { isBlockedBetween } from "@/lib/social/blocksRepository";
import {
  mapUserForPublicProfile,
  resolveProfileAccessFromContext,
} from "@/lib/social/profileAccess";
import {
  countActiveFollowing,
  countFollowers,
  getActiveFollowingIds,
  getFollowerIds,
  getFollowStatus,
  listMutualFollowerPreviews,
  mapSocialPreview,
  mapSocialPreviews,
} from "@/lib/social/followsRepository";
import { canViewFullProfile } from "@/lib/social/profileAccess";
import { listSessionsForProfileOverview } from "@/lib/workouts/sessionsRepository";
import { findUserById } from "@/lib/users/repository";
import { parseFeedMediaJson } from "@/lib/posts/mapFeedMedia";

const PROFILE_POSTS_PAGE = 24;
const PREVIEW_POSTS_MAX = 3;

type PreviewRow = {
  id: string;
  user_id: string;
  visibility: string;
  created_at: string;
  media: unknown;
  author_username: string;
  author_avatar_url: string;
};

async function loadPreviewPosts(targetUserId: string) {
  const rows = await query<PreviewRow>(
    `SELECT p.id, p.user_id, p.visibility, p.created_at, p.media,
            u.username AS author_username, u.avatar_url AS author_avatar_url
     FROM posts p
     INNER JOIN users u ON u.id = p.user_id
     WHERE p.user_id = $1::uuid
     ORDER BY p.created_at DESC, p.id DESC
     LIMIT $2`,
    [targetUserId, PREVIEW_POSTS_MAX]
  );
  return rows.map((p) => ({
    id: p.id,
    userId: p.user_id,
    visibility: p.visibility,
    createdAt: p.created_at,
    media: parseFeedMediaJson(p.media)?.slice(0, 1) ?? [],
    content: "",
    authorUsername: p.author_username,
    authorAvatarUrl: p.author_avatar_url,
    previewOnly: true,
  }));
}

export async function getPublicProfileOverview(viewerId: string, targetUserId: string) {
  const target = await findUserById(targetUserId);
  if (!target) return null;

  const [blocked, followOut, followIn] = await Promise.all([
    isBlockedBetween(viewerId, targetUserId),
    getFollowStatus(viewerId, targetUserId),
    getFollowStatus(targetUserId, viewerId),
  ]);

  const following = followOut === "active";
  const followPending = followOut === "pending";
  const followsYou = followIn === "active";
  const viewerFollowsTarget = following || viewerId === targetUserId;

  const { restrictionLevel, canView, canPreview, canShell } = resolveProfileAccessFromContext(
    viewerId,
    target,
    blocked,
    viewerFollowsTarget
  );
  const restricted = restrictionLevel !== "none" && viewerId !== targetUserId;

  let userMode: "full" | "restricted" | "unavailable" = "unavailable";
  if (blocked || restrictionLevel === "unavailable") userMode = "unavailable";
  else if (canView) userMode = "full";
  else if (canPreview) userMode = "restricted";

  const user = mapUserForPublicProfile(target, viewerId, userMode);

  const postCountTotalP = countPostsByUser(targetUserId);
  const postCountVisibleP = countVisiblePostsByUser(targetUserId, viewerId);

  const postsPageP = canView
    ? listPostsByUserPageForClient(targetUserId, viewerId, {
        limit: PROFILE_POSTS_PAGE,
        grid: true,
      })
    : null;
  const previewPostsP = canPreview ? loadPreviewPosts(targetUserId) : Promise.resolve([]);
  const sessionsP = canView ? listSessionsForProfileOverview(targetUserId) : Promise.resolve([]);
  const workoutTitlesP = canView
    ? query<{ id: string; title: string }>(
        `SELECT id, title FROM workouts WHERE user_id = $1::uuid`,
        [targetUserId]
      )
    : Promise.resolve([]);
  const followerCountP = canView ? countFollowers(targetUserId) : Promise.resolve(0);
  const followingCountP = canView ? countActiveFollowing(targetUserId) : Promise.resolve(0);
  const mutualP =
    canShell && !blocked
      ? listMutualFollowerPreviews(viewerId, targetUserId, 5).then((rows) =>
          mapSocialPreviews(
            viewerId,
            rows.map((r) => r.id)
          )
        )
      : Promise.resolve([]);

  const [
    postCountTotal,
    postCountVisible,
    postsPageResult,
    previewPosts,
    sessionsRaw,
    workoutRows,
    followerCount,
    followingCount,
    mutualFollowers,
  ] = await Promise.all([
    postCountTotalP,
    postCountVisibleP,
    postsPageP,
    previewPostsP,
    sessionsP,
    workoutTitlesP,
    followerCountP,
    followingCountP,
    mutualP,
  ]);

  const postsHiddenByVisibility = postCountTotal > postCountVisible;
  const postsPage = canView
    ? {
        posts: postsPageResult?.posts ?? [],
        nextCursor: postsPageResult?.nextCursor ?? null,
        total: postCountTotal,
      }
    : { posts: [], nextCursor: null, total: postCountTotal };

  const workoutTitles: Record<string, string> = {};
  for (const w of workoutRows) workoutTitles[w.id] = w.title;

  const sessions = sessionsRaw.map((s) => ({
    id: s.id,
    userId: s.userId,
    workoutId: s.workoutId,
    performedAt: s.performedAt,
    notes: s.notes,
    createdAt: s.createdAt,
    workoutTitle: s.workoutTitle ?? "Rutina",
  }));

  return {
    user,
    restricted,
    restrictionLevel: blocked ? "unavailable" : restrictionLevel,
    blocked,
    following,
    followPending,
    followsYou,
    followerCount,
    followingCount,
    mutualFollowers,
    posts: postsPage,
    previewPosts,
    postCountVisible,
    postCountTotal,
    postsHiddenByVisibility,
    sessions,
    workoutTitles,
    sectionAccess: {
      bio: canView || canPreview,
      stats: canView,
      sessions: canView,
      socialLists: canView,
    },
  };
}

export async function listProfileSocialPage(
  viewerId: string,
  targetUserId: string,
  kind: "followers" | "following",
  opts: { limit: number; cursor?: string }
) {
  const target = await findUserById(targetUserId);
  if (!target) return null;

  const canView = await canViewFullProfile(viewerId, targetUserId, target.profile_visibility);
  if (!canView) {
    throw Object.assign(new Error("social list is restricted"), { code: "PROFILE_FORBIDDEN" });
  }

  const allIds =
    kind === "followers"
      ? await getFollowerIds(targetUserId)
      : await getActiveFollowingIds(targetUserId);

  let start = 0;
  if (opts.cursor) {
    const idx = allIds.indexOf(opts.cursor);
    start = idx === -1 ? allIds.length : idx + 1;
  }
  const slice = allIds.slice(start, start + opts.limit);
  const nextCursor =
    start + slice.length < allIds.length && slice.length > 0 ? slice[slice.length - 1]! : null;

  const users = [];
  for (const id of slice) {
    const preview = await mapSocialPreview(id, viewerId);
    if (preview) users.push(preview);
  }

  return { users, nextCursor, total: allIds.length };
}
