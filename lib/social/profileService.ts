import { canViewFullProfile } from "@/lib/social/profileAccess";
import { findUserById, updateUserProfile, type ProfileUpdateInput } from "@/lib/users/repository";
import { mapUserRowToProfileUser, mapUserRowToSafeUser } from "@/lib/users/types";

export async function getProfileForViewer(viewerId: string, targetUserId: string) {
  const user = await findUserById(targetUserId);
  if (!user) return null;

  const isOwner = viewerId === user.id;
  const visibility = user.profile_visibility ?? "public";

  if (!isOwner && visibility === "followers") {
    const canSee = await canViewFullProfile(viewerId, targetUserId, visibility);
    if (!canSee) {
      return { user: mapUserRowToProfileUser(user, viewerId, { restricted: true }) };
    }
  }

  if (!isOwner && visibility === "private") {
    return { user: mapUserRowToProfileUser(user, viewerId, { restricted: true }) };
  }

  return { user: mapUserRowToProfileUser(user, viewerId) };
}

export async function updateProfileForUser(userId: string, input: ProfileUpdateInput) {
  const updated = await updateUserProfile(userId, input);
  if (!updated) return null;
  return { message: "profile updated", user: mapUserRowToSafeUser(updated, { includeEmail: true }) };
}
