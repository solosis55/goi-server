/**
 * Copia follows de store.json a Neon.
 * Uso: npm run db:migrate-follows
 */
import { readFileSync } from "node:fs";
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

const storePath = join(__dirname, "..", "..", "Goi Web", "server", "data", "store.json");
const pool = new Pool({ connectionString: url });

async function main() {
  execSync("node scripts/ensure-user-profile-columns.mjs", {
    cwd: join(__dirname, ".."),
    stdio: "inherit",
  });

  const raw = readFileSync(storePath, "utf8");
  const store = JSON.parse(raw);
  const follows = store.follows ?? [];

  const { rows: users } = await pool.query(`SELECT id FROM users`);
  const userIds = new Set(users.map((r) => r.id));

  let ok = 0;
  let skip = 0;

  console.log(`Migrando ${follows.length} follow(s)…\n`);

  for (const f of follows) {
    if (!f.id || !f.followerId || !f.followingId) {
      skip += 1;
      continue;
    }
    if (!userIds.has(f.followerId) || !userIds.has(f.followingId)) {
      skip += 1;
      console.warn(`  ⚠ follow ${f.id}: usuario no en Neon`);
      continue;
    }
    const status = f.status === "pending" ? "pending" : "active";
    try {
      await pool.query(
        `INSERT INTO follows (id, follower_id, following_id, status, created_at)
         VALUES ($1, $2, $3, $4, COALESCE($5::timestamptz, NOW()))
         ON CONFLICT (follower_id, following_id) DO UPDATE SET
           status = EXCLUDED.status,
           created_at = EXCLUDED.created_at`,
        [f.id, f.followerId, f.followingId, status, f.createdAt ?? null]
      );
      ok += 1;
      console.log(`  ✓ ${f.followerId.slice(0, 8)} → ${f.followingId.slice(0, 8)} (${status})`);
    } catch (err) {
      skip += 1;
      console.warn(`  ⚠ ${f.id}: ${err.message ?? err}`);
    }
  }

  console.log(`\nListo: ${ok} follow(s). Omitidos: ${skip}.`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
