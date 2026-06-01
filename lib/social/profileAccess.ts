import {
  getActiveFollowingIds,
  getFollowerIds,
  isActiveFollowing,
  mapSocialPreview,
} from "@/lib/social/followsRepository";
import { isBlockedBetween } from "@/lib/social/blocksRepository";
import { findUserById } from "@/lib/users/repository";
import type { UserRow } from "@/lib/users/types";

/** Puede ver perfil completo (no restringido). */
export async function canViewFullProfile(
  viewerId: string,
  targetUserId: string,
  profileVisibility?: string
): Promise<boolean> {
  if (viewerId === targetUserId) return true;
  const vis =
    profileVisibility ?? (await findUserById(targetUserId))?.profile_visibility ?? "public";
  if (vis === "public") return true;
  if (vis === "followers" || vis === "request") {
    return isActiveFollowing(viewerId, targetUserId);
  }
  return false;
}

export async function canViewProfileShell(viewerId: string, targetUserId: string): Promise<boolean> {
  if (!viewerId || !targetUserId) return false;
  if (viewerId === targetUserId) return true;
  if (await isBlockedBetween(viewerId, targetUserId)) return false;
  const target = await findUserById(targetUserId);
  if (!target) return false;
  if (target.profile_visibility === "private") return false;
  return true;
}

export async function canViewProfilePreview(
  viewerId: string,
  targetUserId: string
): Promise<boolean> {
  if (!(await canViewProfileShell(viewerId, targetUserId))) return false;
  if (viewerId === targetUserId) return false;
  return !(await canViewFullProfile(viewerId, targetUserId));
}

export type ProfileRestrictionLevel = "none" | "partial" | "unavailable";

export type ResolvedProfileAccess = {
  restrictionLevel: ProfileRestrictionLevel;
  canView: boolean;
  canPreview: boolean;
  canShell: boolean;
};

/** Calcula permisos sin consultas extra (usuario y follow ya resueltos). */
export function resolveProfileAccessFromContext(
  viewerId: string,
  target: UserRow,
  blocked: boolean,
  viewerFollowsTarget: boolean
): ResolvedProfileAccess {
  if (viewerId === target.id) {
    return { restrictionLevel: "none", canView: true, canPreview: false, canShell: true };
  }
  if (blocked) {
    return { restrictionLevel: "unavailable", canView: false, canPreview: false, canShell: false };
  }
  const vis = target.profile_visibility ?? "public";
  if (vis === "private") {
    return { restrictionLevel: "unavailable", canView: false, canPreview: false, canShell: false };
  }
  const canView =
    vis === "public" || ((vis === "followers" || vis === "request") && viewerFollowsTarget);
  if (canView) {
    return { restrictionLevel: "none", canView: true, canPreview: false, canShell: true };
  }
  if (vis === "followers" || vis === "request") {
    return { restrictionLevel: "partial", canView: false, canPreview: true, canShell: true };
  }
  return { restrictionLevel: "unavailable", canView: false, canPreview: false, canShell: false };
}

export async function getProfileRestrictionLevel(
  viewerId: string,
  targetUserId: string
): Promise<ProfileRestrictionLevel> {
  if (viewerId === targetUserId) return "none";
  if (!(await canViewProfileShell(viewerId, targetUserId))) return "unavailable";
  if (await canViewFullProfile(viewerId, targetUserId)) return "none";
  if (await canViewProfilePreview(viewerId, targetUserId)) return "partial";
  return "unavailable";
}

export async function getMutualFollowerPreviews(
  viewerId: string,
  targetUserId: string,
  limit = 5
) {
  const targetFollowers = await getFollowerIds(targetUserId);
  const targetSet = new Set(targetFollowers);
  const following = await getActiveFollowingIds(viewerId);
  const mutual = [];
  for (const id of following) {
    if (id === targetUserId) continue;
    if (!targetSet.has(id)) continue;
    const preview = await mapSocialPreview(viewerId, id);
    if (preview) mutual.push(preview);
    if (mutual.length >= limit) break;
  }
  return mutual;
}

export function mapUserForPublicProfile(
  target: UserRow,
  viewerId: string,
  mode: "full" | "restricted" | "unavailable"
) {
  const base = {
    id: target.id,
    username: target.username,
    avatarUrl: target.avatar_url ?? "",
    bannerUrl: target.banner_url ?? "",
    bannerShowInFeed: target.banner_show_in_feed ?? true,
    goal: target.goal ?? "",
    bio: target.bio ?? "",
    location: target.location ?? "",
    websiteUrl: target.website_url ?? "",
    instagramUrl: target.instagram_url ?? "",
    stravaUrl: target.strava_url ?? "",
    profileVisibility: target.profile_visibility ?? "public",
    profileSections: {
      bio: "public" as const,
      stats: "public" as const,
      sessions: "followers" as const,
      socialLists: "followers" as const,
    },
    discoverable: target.discoverable !== false,
    requireAuthToView: false,
    defaultPostVisibility: "public" as const,
    pinnedPostId: target.pinned_post_id ?? "",
    createdAt: target.created_at,
    updatedAt: target.updated_at,
    ...(viewerId === target.id ? { email: target.email } : {}),
  };

  if (mode === "full") return base;

  if (mode === "restricted") {
    const showGoal = Boolean(target.goal?.trim());
    return {
      ...base,
      bio: "",
      goal: showGoal ? target.goal : "",
      location: "",
      websiteUrl: "",
      instagramUrl: "",
      stravaUrl: "",
      bannerUrl: "",
      pinnedPostId: "",
      restrictedToFollowers: true,
    };
  }

  return {
    ...base,
    bio: "",
    goal: "",
    location: "",
    websiteUrl: "",
    instagramUrl: "",
    stravaUrl: "",
    bannerUrl: "",
    pinnedPostId: "",
    restrictedToFollowers: true,
    profileUnavailable: true,
  };
}
