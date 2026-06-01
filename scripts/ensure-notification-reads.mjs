/**
 * Crea tabla notification_reads en BDs existentes.
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

async function main() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notification_reads (
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      notification_key VARCHAR(120) NOT NULL,
      read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, notification_key)
    )
  `);
  await pool.query(
    `CREATE INDEX IF NOT EXISTS notification_reads_user_id_idx ON notification_reads(user_id)`
  );
  console.log("Tabla notification_reads lista.");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
