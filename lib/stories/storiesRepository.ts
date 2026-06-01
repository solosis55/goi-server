import { query } from "@/lib/db";

export type StorySlideRow = { id: string; mediaUrl: string };

export type StoryReelRow = {
  id: string;
  user_id: string;
  slides: StorySlideRow[];
  created_at: string;
  expires_at: string;
};

const STORY_TTL_MS = 24 * 60 * 60 * 1000;

export async function pruneExpiredStoryReels(): Promise<void> {
  await query(`DELETE FROM story_reels WHERE expires_at <= NOW()`);
}

export async function createStoryReel(
  userId: string,
  slides: StorySlideRow[]
): Promise<StoryReelRow> {
  const id = crypto.randomUUID();
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + STORY_TTL_MS);
  const rows = await query<StoryReelRow>(
    `INSERT INTO story_reels (id, user_id, slides, created_at, expires_at)
     VALUES ($1, $2, $3::jsonb, $4, $5)
     RETURNING id, user_id, slides, created_at::text, expires_at::text`,
    [id, userId, JSON.stringify(slides), createdAt.toISOString(), expiresAt.toISOString()]
  );
  const reel = rows[0];
  if (!reel) throw new Error("No se pudo crear la historia");
  return reel;
}

export async function listActiveReelsForUserIds(userIds: string[]): Promise<StoryReelRow[]> {
  if (userIds.length === 0) return [];
  const rows = await query<StoryReelRow>(
    `SELECT id, user_id, slides, created_at::text, expires_at::text
     FROM story_reels
     WHERE user_id = ANY($1::uuid[]) AND expires_at > NOW()
     ORDER BY created_at ASC`,
    [userIds]
  );
  return rows.map((r) => ({
    ...r,
    slides: Array.isArray(r.slides) ? r.slides : (JSON.parse(String(r.slides)) as StorySlideRow[]),
  }));
}
