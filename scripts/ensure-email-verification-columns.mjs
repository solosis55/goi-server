/**
 * Columnas de verificación de email en users.
 * Usuarios existentes se marcan como verificados (grandfather).
 * Uso: npm run db:ensure-email-verification
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

const alters = [
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token_hash TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_expires TIMESTAMPTZ`,
];

async function main() {
  for (const sql of alters) {
    await pool.query(sql);
  }
  const { rowCount } = await pool.query(
    `UPDATE users SET email_verified = TRUE WHERE email_verified = FALSE`
  );
  console.log(`Verificación de email: columnas listas; ${rowCount ?? 0} usuarios existentes marcados como verificados.`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
