/**
 * Copia usuarios de Goi Web/server/data/store.json a Neon (misma id y password bcrypt).
 * Uso: npm run db:migrate-users
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { Pool } from "@neondatabase/serverless";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "..", ".env.local") });

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("Falta DATABASE_URL en .env.local");
  process.exit(1);
}

const storePath = join(__dirname, "..", "..", "Goi Web", "server", "data", "store.json");

const pool = new Pool({ connectionString: url });

async function main() {
  execSync("node scripts/ensure-user-profile-columns.mjs", {
    cwd: join(__dirname, ".."),
    stdio: "inherit",
  });

  const raw = readFileSync(storePath, "utf8");
  const store = JSON.parse(raw);
  const users = store.users ?? [];
  let upserted = 0;

  for (const u of users) {
    if (!u.id || !u.email || !u.password) continue;
    try {
      await pool.query(
        `INSERT INTO users (
           id, username, email, password_hash, bio, goal, avatar_url,
           banner_url, banner_show_in_feed, website_url, instagram_url, strava_url, location,
           profile_visibility, pinned_post_id, created_at, updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
           COALESCE($16::timestamptz, NOW()), COALESCE($17::timestamptz, NOW()))
         ON CONFLICT (id) DO UPDATE SET
           username = EXCLUDED.username,
           email = EXCLUDED.email,
           password_hash = EXCLUDED.password_hash,
           bio = EXCLUDED.bio,
           goal = EXCLUDED.goal,
           avatar_url = EXCLUDED.avatar_url,
           banner_url = EXCLUDED.banner_url,
           banner_show_in_feed = EXCLUDED.banner_show_in_feed,
           website_url = EXCLUDED.website_url,
           instagram_url = EXCLUDED.instagram_url,
           strava_url = EXCLUDED.strava_url,
           location = EXCLUDED.location,
           profile_visibility = EXCLUDED.profile_visibility,
           pinned_post_id = EXCLUDED.pinned_post_id,
           updated_at = NOW()`,
        [
          u.id,
          String(u.username).slice(0, 32),
          String(u.email).toLowerCase(),
          u.password,
          u.bio ?? "",
          u.goal ?? "",
          u.avatarUrl ?? "",
          u.bannerUrl ?? "",
          u.bannerShowInFeed !== false,
          u.websiteUrl ?? "",
          u.instagramUrl ?? "",
          u.stravaUrl ?? "",
          u.location ?? "",
          u.profileVisibility ?? "public",
          u.pinnedPostId || null,
          u.createdAt ?? null,
          u.updatedAt ?? null,
        ]
      );
      upserted += 1;
      console.log(`  ✓ ${u.username} (${u.email})`);
    } catch (err) {
      console.warn(`  ⚠ ${u.username}: ${err.message ?? err}`);
    }
  }

  console.log(`\n${upserted} usuario(s) migrados a Neon.`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
