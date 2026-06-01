import { activeFollowingSetForViewer } from "@/lib/social/followsRepository";
import {
  createStoryReel,
  listActiveReelsForUserIds,
  pruneExpiredStoryReels,
  type StorySlideRow,
} from "@/lib/stories/storiesRepository";
import { findUsersByIds } from "@/lib/users/repository";

export async function createStoryForUser(
  userId: string,
  slidesInput: { type: "image"; url: string }[]
) {
  await pruneExpiredStoryReels();
  const slides: StorySlideRow[] = slidesInput.map((s) => ({
    id: crypto.randomUUID(),
    mediaUrl: s.url,
  }));
  const reel = await createStoryReel(userId, slides);
  return {
    reel: {
      id: reel.id,
      userId: reel.user_id,
      slides,
      expiresAt: reel.expires_at,
      createdAt: reel.created_at,
    },
  };
}

export async function listStoriesFeed(viewerId: string) {
  await pruneExpiredStoryReels();
  const allowed = await activeFollowingSetForViewer(viewerId);
  const reels = await listActiveReelsForUserIds([...allowed]);
  const userIds = [...new Set(reels.map((r) => r.user_id))];
  const users = await findUsersByIds(userIds);
  const userMap = new Map(users.map((u) => [u.id, u]));

  const byUser = new Map<string, typeof reels>();
  for (const reel of reels) {
    const list = byUser.get(reel.user_id) ?? [];
    list.push(reel);
    byUser.set(reel.user_id, list);
  }

  type SlideOut = { id: string; mediaUrl: string; reelId: string };

  const authors = [...byUser.entries()].map(([userId, userReels]) => {
    const author = userMap.get(userId);
    const sortedReels = [...userReels].sort((a, b) =>
      a.created_at < b.created_at ? -1 : 1
    );
    const slidesMerged: SlideOut[] = [];
    for (const reel of sortedReels) {
      for (const s of reel.slides) {
        slidesMerged.push({ id: s.id, mediaUrl: s.mediaUrl, reelId: reel.id });
      }
    }
    return {
      userId,
      authorUsername: author?.username ?? "Usuario",
      authorAvatarUrl: author?.avatar_url ?? "",
      reels: sortedReels.map((r) => ({ createdAt: r.created_at })),
      slides: slidesMerged,
    };
  });

  authors.sort((a, b) => {
    if (a.userId === viewerId) return -1;
    if (b.userId === viewerId) return 1;
    const ta = Math.max(...a.reels.map((r) => new Date(r.createdAt).getTime()), 0);
    const tb = Math.max(...b.reels.map((r) => new Date(r.createdAt).getTime()), 0);
    return tb - ta;
  });

  return {
    authors: authors.map(({ userId, authorUsername, authorAvatarUrl, slides }) => ({
      userId,
      authorUsername,
      authorAvatarUrl,
      slides: slides.map((s) => ({ id: s.id, mediaUrl: s.mediaUrl, reelId: s.reelId })),
    })),
  };
}
