/**
 * Tablas/columnas para stories, bloqueos, discover y prefs.
 * Uso: npm run db:ensure-social-tables
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { Pool } from "@neondatabase/serverless";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "..", ".env.local") });

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("Falta DATABASE_URL en .env.local");
  process.exit(1);
}

const pool = new Pool({ connectionString: url });

async function main() {
  execSync("node scripts/ensure-user-profile-columns.mjs", {
    cwd: join(__dirname, ".."),
    stdio: "inherit",
  });

  await pool.query(
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS discoverable BOOLEAN NOT NULL DEFAULT TRUE`
  );
  await pool.query(
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_prefs JSONB NOT NULL DEFAULT '{"mutedTypes":[]}'::jsonb`
  );

  await pool.query(`
    CREATE TABLE IF NOT EXISTS story_reels (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      slides JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS story_reels_user_id_idx ON story_reels(user_id)`);
  await pool.query(
    `CREATE INDEX IF NOT EXISTS story_reels_expires_at_idx ON story_reels(expires_at)`
  );

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_blocks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT user_blocks_pair_unique UNIQUE (blocker_id, blocked_id)
    )
  `);
  await pool.query(
    `CREATE INDEX IF NOT EXISTS user_blocks_blocker_id_idx ON user_blocks(blocker_id)`
  );

  console.log("Stories, bloqueos y columnas sociales listas.");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
