import type { UserRow } from "@/lib/users/types";

export function isProfileDiscoverable(user: UserRow): boolean {
  if (user.profile_visibility === "private") return false;
  if (user.discoverable === false) return false;
  return (
    user.profile_visibility === "public" ||
    user.profile_visibility === "followers" ||
    user.profile_visibility === "request"
  );
}
