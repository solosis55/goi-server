import { isProfileDiscoverable } from "@/lib/discover/profileVisibility";
import { listUsersExcept } from "@/lib/users/repository";
import type { UserRow } from "@/lib/users/types";

export async function searchDiscoverableUsers(
  viewerId: string,
  queryRaw: string,
  limit = 24
): Promise<UserRow[]> {
  const q = queryRaw.trim().toLowerCase().replace(/^@/, "");
  if (!q) return [];

  const limitClamped = Math.min(Math.max(1, limit), 40);
  const all = await listUsersExcept(viewerId);
  const matches: UserRow[] = [];

  for (const user of all) {
    if (!isProfileDiscoverable(user)) continue;
    const username = user.username.toLowerCase();
    if (!username.includes(q)) continue;
    matches.push(user);
    if (matches.length >= limitClamped) break;
  }

  matches.sort((a, b) => {
    const au = a.username.toLowerCase();
    const bu = b.username.toLowerCase();
    const aExact = au === q ? 0 : 1;
    const bExact = bu === q ? 0 : 1;
    if (aExact !== bExact) return aExact - bExact;
    const aStarts = au.startsWith(q) ? 0 : 1;
    const bStarts = bu.startsWith(q) ? 0 : 1;
    if (aStarts !== bStarts) return aStarts - bStarts;
    return au.localeCompare(bu);
  });

  return matches;
}
