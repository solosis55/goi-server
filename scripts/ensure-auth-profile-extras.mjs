/**
 * Columnas de reset de contraseña en users + carpetas locales.
 * Uso: npm run db:ensure-auth-profile-extras
 */
import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
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

function dataDir() {
  const env = process.env.GOI_DATA_DIR?.trim();
  if (env) return resolve(env);
  return join(__dirname, "..", "..", "Goi Web", "server", "data");
}

const pool = new Pool({ connectionString: url });

async function main() {
  execSync("node scripts/ensure-social-tables.mjs", {
    cwd: join(__dirname, ".."),
    stdio: "inherit",
  });

  await pool.query(
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token_hash TEXT`
  );
  await pool.query(
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMPTZ`
  );

  const base = dataDir();
  mkdirSync(join(base, "uploads", "avatars"), { recursive: true });
  mkdirSync(join(base, "uploads", "banners"), { recursive: true });
  mkdirSync(join(base, "personal-body"), { recursive: true });

  console.log("Reset de contraseña y carpetas de datos listas.");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
