/**
 * Añade coordenadas de perfil para discover «Cerca» por GPS.
 * Uso: npm run db:ensure-geo
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
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMPTZ`,
];

async function main() {
  for (const sql of alters) {
    await pool.query(sql);
  }
  console.log("Columnas geo de perfil listas (latitude, longitude, location_updated_at).");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
