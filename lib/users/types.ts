export type ProfileVisibility = "public" | "followers" | "private" | "request";

export type UserRow = {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  bio: string;
  goal: string;
  avatar_url: string;
  banner_url: string;
  banner_show_in_feed: boolean;
  website_url: string;
  instagram_url: string;
  strava_url: string;
  location: string;
  profile_visibility: ProfileVisibility;
  pinned_post_id: string | null;
  discoverable: boolean;
  notification_prefs: { mutedTypes: string[] };
  created_at: string;
  updated_at: string;
};

/** Respuesta al cliente (sin password). Compatible con Goi App / Web. */
export type SafeUserDto = {
  id: string;
  username: string;
  email: string;
  bio: string;
  goal: string;
  avatarUrl: string;
  bannerUrl: string;
  bannerShowInFeed: boolean;
  websiteUrl: string;
  instagramUrl: string;
  stravaUrl: string;
  location: string;
  profileVisibility: ProfileVisibility;
  profileSections: {
    bio: "public" | "followers" | "private";
    stats: "public" | "followers" | "hidden";
    sessions: "public" | "followers" | "private";
    socialLists: "public" | "followers" | "hidden";
  };
  discoverable: boolean;
  requireAuthToView: boolean;
  defaultPostVisibility: "public" | "followers" | "private";
  pinnedPostId: string;
  createdAt: string;
  updatedAt: string;
};

export type ProfileUserDto = Omit<SafeUserDto, "email"> & {
  email?: string;
  restrictedToFollowers?: boolean;
};

export function mapUserRowToSafeUser(row: UserRow, opts?: { includeEmail?: boolean }): SafeUserDto {
  const vis = row.profile_visibility ?? "public";
  return {
    id: row.id,
    username: row.username,
    email: opts?.includeEmail === false ? "" : row.email,
    bio: row.bio ?? "",
    goal: row.goal ?? "",
    avatarUrl: row.avatar_url ?? "",
    bannerUrl: row.banner_url ?? "",
    bannerShowInFeed: row.banner_show_in_feed ?? true,
    websiteUrl: row.website_url ?? "",
    instagramUrl: row.instagram_url ?? "",
    stravaUrl: row.strava_url ?? "",
    location: row.location ?? "",
    profileVisibility: vis,
    profileSections: {
      bio: "public",
      stats: "public",
      sessions: "followers",
      socialLists: "followers",
    },
    discoverable: row.discoverable !== false,
    requireAuthToView: false,
    defaultPostVisibility: "public",
    pinnedPostId: row.pinned_post_id ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapUserRowToProfileUser(
  row: UserRow,
  viewerId: string,
  opts?: { restricted?: boolean }
): ProfileUserDto {
  const isOwner = viewerId === row.id;
  const base = mapUserRowToSafeUser(row, { includeEmail: isOwner });
  const { email, ...rest } = base;
  const profile: ProfileUserDto = {
    ...rest,
    ...(isOwner ? { email: row.email } : {}),
  };
  if (opts?.restricted) {
    return {
      ...profile,
      bio: "",
      goal: "",
      location: "",
      websiteUrl: "",
      instagramUrl: "",
      stravaUrl: "",
      bannerUrl: "",
      pinnedPostId: "",
      restrictedToFollowers: true,
    };
  }
  return profile;
}
