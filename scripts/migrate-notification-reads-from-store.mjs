/**
 * Copia notificationReads de store.json a Neon.
 * Uso: npm run db:migrate-notification-reads
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
  execSync("node scripts/ensure-notification-reads.mjs", {
    cwd: join(__dirname, ".."),
    stdio: "inherit",
  });

  const raw = readFileSync(storePath, "utf8");
  const store = JSON.parse(raw);
  const reads = store.notificationReads ?? [];

  const { rows: users } = await pool.query(`SELECT id FROM users`);
  const userIds = new Set(users.map((r) => r.id));

  let ok = 0;
  let skip = 0;

  console.log(`Migrando ${reads.length} lectura(s) de notificación…\n`);

  for (const r of reads) {
    if (!r.userId || !r.key) {
      skip += 1;
      continue;
    }
    if (!userIds.has(r.userId)) {
      skip += 1;
      continue;
    }
    try {
      await pool.query(
        `INSERT INTO notification_reads (user_id, notification_key, read_at)
         VALUES ($1, $2, COALESCE($3::timestamptz, NOW()))
         ON CONFLICT (user_id, notification_key) DO NOTHING`,
        [r.userId, String(r.key).slice(0, 120), r.readAt ?? null]
      );
      ok += 1;
      console.log(`  ✓ ${r.userId.slice(0, 8)}… ${r.key}`);
    } catch (err) {
      skip += 1;
      console.warn(`  ⚠ ${r.key}: ${err.message ?? err}`);
    }
  }

  console.log(`\nListo: ${ok} registro(s). Omitidos: ${skip}.`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
