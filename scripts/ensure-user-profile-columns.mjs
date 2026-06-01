/**
 * Añade columnas de perfil a users y tabla follows en BDs ya creadas.
 * Uso: npm run db:ensure-social
 */
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

const pool = new Pool({ connectionString: url });

const userAlters = [
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS banner_url TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS banner_show_in_feed BOOLEAN NOT NULL DEFAULT TRUE`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS website_url TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS instagram_url TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS strava_url TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS location TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_visibility VARCHAR(20) NOT NULL DEFAULT 'public'`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS pinned_post_id UUID`,
];

async function main() {
  for (const sql of userAlters) {
    await pool.query(sql);
  }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS follows (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT follows_pair_unique UNIQUE (follower_id, following_id)
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS follows_follower_id_idx ON follows(follower_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS follows_following_id_idx ON follows(following_id)`);
  console.log("Columnas de perfil y tabla follows listas.");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
