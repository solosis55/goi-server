import { mapUserRowToSafeUser } from "@/lib/users/types";
import type { RankedDiscoverUser } from "@/lib/discover/discoverUsers";
import type { UserRow } from "@/lib/users/types";

function followFlags(
  statusMap: Map<string, "pending" | "active">,
  targetId: string
) {
  const status = statusMap.get(targetId);
  return {
    isFollowing: status === "active",
    followPending: status === "pending",
  };
}

export function mapRankedToDiscoverDto(
  row: RankedDiscoverUser,
  currentUserId: string,
  statusMap: Map<string, "pending" | "active">
) {
  const { isFollowing, followPending } = followFlags(statusMap, row.user.id);
  return {
    ...mapUserRowToSafeUser(row.user, {
      includeEmail: currentUserId === row.user.id,
    }),
    isFollowing,
    followPending,
    mutualCount: row.mutualCount,
    mutualPreview: row.mutualPreview,
    reason: row.reason,
    activeThisWeek: row.activeThisWeek,
    trainedThisWeek: row.trainedThisWeek,
    distanceKm: row.distanceKm,
    nearby: row.nearby,
  };
}

export function mapUserToDiscoverDto(
  user: UserRow,
  currentUserId: string,
  statusMap: Map<string, "pending" | "active">
) {
  const { isFollowing, followPending } = followFlags(statusMap, user.id);
  return {
    ...mapUserRowToSafeUser(user, { includeEmail: currentUserId === user.id }),
    isFollowing,
    followPending,
    mutualCount: 0,
    mutualPreview: [],
    reason: "Perfil en GoI",
    activeThisWeek: false,
    trainedThisWeek: false,
  };
}
