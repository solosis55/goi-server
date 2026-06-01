import { getActiveFollowingIds } from "@/lib/social/followsRepository";

type PostAccess = {
  userId: string;
  visibility: "public" | "followers" | "private";
};

export function canViewerAccessPost(
  post: PostAccess,
  viewerUserId: string | null | undefined,
  activeFollowing: Set<string>
): boolean {
  if (!viewerUserId) return post.visibility === "public";
  if (post.userId === viewerUserId) return true;
  if (post.visibility === "private") return false;
  if (post.visibility === "public") return true;
  if (post.visibility === "followers") return activeFollowing.has(post.userId);
  return false;
}

export async function buildActiveFollowingSet(
  viewerUserId: string | null | undefined
): Promise<Set<string>> {
  if (!viewerUserId) return new Set();
  return new Set([viewerUserId, ...(await getActiveFollowingIds(viewerUserId))]);
}
