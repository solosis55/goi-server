import { mapRankedToDiscoverDto } from "@/lib/discover/discoverDto";
import { rankDiscoverUsersOptimized } from "@/lib/discover/discoverUsers";
import { getBlockedIdsForUser } from "@/lib/social/blocksRepository";
import {
  getActiveFollowingIds,
  getFollowerIds,
  getOutgoingFollowStatusMap,
  listPendingIncomingRequests,
  listPendingSentRequests,
  mapSocialPreviews,
} from "@/lib/social/followsRepository";
import { buildSocialWeeklySummary } from "@/lib/social/socialWeekly";

const DISCOVER_PREVIEW_FULL = 48;
const DISCOVER_PREVIEW_LITE = 12;
const FOLLOWING_PREVIEW = 8;
const FOLLOW_BACK_PREVIEW = 8;

export async function buildSocialHubPayload(viewerId: string, opts?: { lite?: boolean }) {
  const discoverLimit = opts?.lite ? DISCOVER_PREVIEW_LITE : DISCOVER_PREVIEW_FULL;

  const [
    discoverBundle,
    followStatusMap,
    followingIds,
    followerIds,
    followRequests,
    sentRequests,
    blockedIds,
    weekly,
  ] = await Promise.all([
    rankDiscoverUsersOptimized(viewerId, discoverLimit),
    getOutgoingFollowStatusMap(viewerId),
    getActiveFollowingIds(viewerId),
    getFollowerIds(viewerId),
    listPendingIncomingRequests(viewerId),
    listPendingSentRequests(viewerId),
    getBlockedIdsForUser(viewerId),
    buildSocialWeeklySummary(viewerId),
  ]);

  const discoverUsers = discoverBundle.ranked.map((row) =>
    mapRankedToDiscoverDto(row, viewerId, followStatusMap)
  );

  const [followingPreviews, followerPreviews] = await Promise.all([
    mapSocialPreviews(viewerId, followingIds.slice(0, FOLLOWING_PREVIEW)),
    mapSocialPreviews(viewerId, followerIds.slice(0, FOLLOW_BACK_PREVIEW)),
  ]);

  const followBackPreviews = followerPreviews.filter((p) => !p.isFollowing);

  return {
    discoverUsers,
    followingIds,
    followerIds,
    followRequests,
    sentRequests,
    followingPreviews,
    followersTotal: followerIds.length,
    followingTotal: followingIds.length,
    blockedIds,
    followBackPreviews,
    weekly: {
      mySessionsWeek: weekly.mySessionsWeek,
      followingActiveWeek: weekly.followingActiveWeek,
      leaders: weekly.leaders.map((l) => ({
        id: l.userId,
        username: l.username,
        avatarUrl: l.avatarUrl,
        sessionsThisWeek: l.sessionsThisWeek,
      })),
    },
  };
}
