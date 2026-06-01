import { buildActiveFollowingSet, canViewerAccessPost } from "@/lib/posts/canViewPost";
import type { ClientPost } from "@/lib/types/clientPost";

/** Filtra visibilidad y scope sin N+1 a Neon. */
export async function filterPostsForFeed(
  posts: ClientPost[],
  viewerUserId: string | null | undefined,
  scope: "all" | "following"
): Promise<ClientPost[]> {
  const activeFollowing = await buildActiveFollowingSet(viewerUserId);

  const scopeSet =
    scope === "following" && viewerUserId ? activeFollowing : null;

  const out: ClientPost[] = [];
  for (const post of posts) {
    if (!canViewerAccessPost(post, viewerUserId, activeFollowing)) continue;
    if (scopeSet && !scopeSet.has(post.userId)) continue;
    out.push(post);
  }
  return out;
}
