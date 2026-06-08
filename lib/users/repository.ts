import { query } from "@/lib/db";
import type { UserRow } from "@/lib/users/types";

const USER_COLUMNS = `id, username, email, password_hash, bio, goal, avatar_url,
  banner_url, banner_show_in_feed, website_url, instagram_url, strava_url, location,
  latitude, longitude, location_updated_at,
  profile_visibility, pinned_post_id, discoverable, notification_prefs, created_at, updated_at`;

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const rows = await query<UserRow>(
    `SELECT ${USER_COLUMNS} FROM users WHERE LOWER(email) = LOWER($1)`,
    [email]
  );
  return rows[0] ?? null;
}

export async function findUserById(id: string): Promise<UserRow | null> {
  const rows = await query<UserRow>(`SELECT ${USER_COLUMNS} FROM users WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

export async function findUsersByIds(ids: string[]): Promise<UserRow[]> {
  if (ids.length === 0) return [];
  const rows = await query<UserRow>(
    `SELECT ${USER_COLUMNS} FROM users WHERE id = ANY($1::uuid[])`,
    [ids]
  );
  return rows;
}

export async function listUsersExcept(excludeId: string): Promise<UserRow[]> {
  return query<UserRow>(
    `SELECT ${USER_COLUMNS} FROM users WHERE id != $1 ORDER BY username`,
    [excludeId]
  );
}

export type NotificationPrefs = { mutedTypes: ("like" | "comment" | "follow")[] };

export async function getNotificationPrefs(userId: string): Promise<NotificationPrefs | null> {
  const rows = await query<{ notification_prefs: NotificationPrefs }>(
    `SELECT notification_prefs FROM users WHERE id = $1`,
    [userId]
  );
  const raw = rows[0]?.notification_prefs;
  if (!raw) return null;
  const muted = Array.isArray(raw.mutedTypes) ? raw.mutedTypes : [];
  return { mutedTypes: muted.filter((t): t is "like" | "comment" | "follow" =>
    t === "like" || t === "comment" || t === "follow"
  ) };
}

export async function updateNotificationPrefs(
  userId: string,
  prefs: NotificationPrefs
): Promise<NotificationPrefs | null> {
  const rows = await query<{ notification_prefs: NotificationPrefs }>(
    `UPDATE users SET notification_prefs = $2::jsonb, updated_at = NOW()
     WHERE id = $1
     RETURNING notification_prefs`,
    [userId, JSON.stringify(prefs)]
  );
  return rows[0]?.notification_prefs ?? null;
}

export async function emailExists(email: string): Promise<boolean> {
  const rows = await query<{ id: string }>(`SELECT id FROM users WHERE LOWER(email) = LOWER($1)`, [
    email,
  ]);
  return Boolean(rows[0]);
}

export async function createUser(input: {
  id?: string;
  username: string;
  email: string;
  passwordHash: string;
  bio?: string;
  goal?: string;
  avatarUrl?: string;
}): Promise<UserRow> {
  const rows = await query<UserRow>(
    `INSERT INTO users (id, username, email, password_hash, bio, goal, avatar_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING ${USER_COLUMNS}`,
    [
      input.id ?? crypto.randomUUID(),
      input.username,
      input.email,
      input.passwordHash,
      input.bio ?? "",
      input.goal ?? "",
      input.avatarUrl ?? "",
    ]
  );
  const created = rows[0];
  if (!created) throw new Error("No se pudo crear el usuario");
  return created;
}

export async function updateUserPasswordHash(userId: string, passwordHash: string): Promise<void> {
  await query(`UPDATE users SET password_hash = $2, updated_at = NOW() WHERE id = $1`, [
    userId,
    passwordHash,
  ]);
}

export type ProfileUpdateInput = {
  username?: string;
  bio?: string;
  goal?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  bannerShowInFeed?: boolean;
  websiteUrl?: string;
  instagramUrl?: string;
  stravaUrl?: string;
  location?: string;
  latitude?: number | null;
  longitude?: number | null;
  profileVisibility?: string;
  pinnedPostId?: string | null;
};

export async function updateUserProfile(
  userId: string,
  input: ProfileUpdateInput
): Promise<UserRow | null> {
  const existing = await findUserById(userId);
  if (!existing) return null;

  const rows = await query<UserRow>(
    `UPDATE users SET
       username = COALESCE($2, username),
       bio = COALESCE($3, bio),
       goal = COALESCE($4, goal),
       avatar_url = COALESCE($5, avatar_url),
       banner_url = COALESCE($6, banner_url),
       banner_show_in_feed = COALESCE($7, banner_show_in_feed),
       website_url = COALESCE($8, website_url),
       instagram_url = COALESCE($9, instagram_url),
       strava_url = COALESCE($10, strava_url),
       location = COALESCE($11, location),
       latitude = CASE WHEN $14::boolean THEN $15::double precision ELSE latitude END,
       longitude = CASE WHEN $14::boolean THEN $16::double precision ELSE longitude END,
       location_updated_at = CASE WHEN $14::boolean THEN NOW() ELSE location_updated_at END,
       profile_visibility = COALESCE($12, profile_visibility),
       pinned_post_id = COALESCE($13, pinned_post_id),
       updated_at = NOW()
     WHERE id = $1
     RETURNING ${USER_COLUMNS}`,
    [
      userId,
      input.username ?? null,
      input.bio ?? null,
      input.goal ?? null,
      input.avatarUrl ?? null,
      input.bannerUrl ?? null,
      input.bannerShowInFeed ?? null,
      input.websiteUrl ?? null,
      input.instagramUrl ?? null,
      input.stravaUrl ?? null,
      input.location ?? null,
      input.profileVisibility ?? null,
      input.pinnedPostId !== undefined ? input.pinnedPostId : null,
      input.latitude !== undefined,
      input.latitude ?? null,
      input.longitude ?? null,
    ]
  );
  return rows[0] ?? null;
}
