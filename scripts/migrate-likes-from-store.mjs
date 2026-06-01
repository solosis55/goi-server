/**
 * Copia likes de Goi Web/server/data/store.json a Neon.
 * Requiere posts y usuarios migrados.
 * Uso: npm run db:migrate-likes
 */
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

async function ensureLikesTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS post_likes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT post_likes_post_user_unique UNIQUE (post_id, user_id)
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS post_likes_post_id_idx ON post_likes(post_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS post_likes_user_id_idx ON post_likes(user_id)`);
}

async function loadIds(table) {
  const { rows } = await pool.query(`SELECT id FROM ${table}`);
  return new Set(rows.map((r) => r.id));
}

async function main() {
  const raw = readFileSync(storePath, "utf8");
  const store = JSON.parse(raw);
  const likes = store.likes ?? [];

  await ensureLikesTable();
  const userIds = await loadIds("users");
  const postIds = await loadIds("posts");

  let ok = 0;
  let skip = 0;

  console.log(`Migrando ${likes.length} like(s)…\n`);

  for (const l of likes) {
    if (!l.id || !l.postId || !l.userId) {
      skip += 1;
      continue;
    }
    if (!postIds.has(l.postId)) {
      skip += 1;
      console.warn(`  ⚠ like ${l.id}: post ${l.postId} no en Neon`);
      continue;
    }
    if (!userIds.has(l.userId)) {
      skip += 1;
      console.warn(`  ⚠ like ${l.id}: usuario ${l.userId} no en Neon`);
      continue;
    }

    try {
      await pool.query(
        `INSERT INTO post_likes (id, post_id, user_id, created_at)
         VALUES ($1, $2, $3, COALESCE($4::timestamptz, NOW()))
         ON CONFLICT (post_id, user_id) DO UPDATE SET
           id = EXCLUDED.id,
           created_at = EXCLUDED.created_at`,
        [l.id, l.postId, l.userId, l.createdAt ?? null]
      );
      ok += 1;
      console.log(`  ✓ like ${l.id.slice(0, 8)}… post ${l.postId.slice(0, 8)}…`);
    } catch (err) {
      skip += 1;
      console.warn(`  ⚠ like ${l.id}: ${err.message ?? err}`);
    }
  }

  console.log(`\nListo: ${ok} like(s). Omitidos: ${skip}.`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
