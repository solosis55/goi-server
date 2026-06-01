import { join, resolve } from "node:path";

/** Carpeta `Goi Web/server/data` (store.json, uploads, personal-body…). */
export function getGoiWebDataDir(): string {
  const env = process.env.GOI_DATA_DIR?.trim();
  if (env) return resolve(env);
  return join(process.cwd(), "..", "Goi Web", "server", "data");
}

export function getUploadsRoot(): string {
  const env = process.env.GOI_UPLOADS_PATH?.trim();
  if (env) return resolve(env);
  return join(getGoiWebDataDir(), "uploads");
}

export function getAvatarsDir(): string {
  return join(getUploadsRoot(), "avatars");
}

export function getBannersDir(): string {
  return join(getUploadsRoot(), "banners");
}

export function getPostsMediaDir(): string {
  return join(getUploadsRoot(), "posts");
}

export function getPersonalBodyDir(): string {
  const env = process.env.GOI_PERSONAL_BODY_DIR?.trim();
  if (env) return resolve(env);
  return join(getGoiWebDataDir(), "personal-body");
}

export function getPersonalRoadmapPath(): string {
  const env = process.env.GOI_PERSONAL_ROADMAP_PATH?.trim();
  if (env) return resolve(env);
  return join(getGoiWebDataDir(), "personal-roadmap.json");
}
