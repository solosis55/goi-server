/**
 * Aplica sql/schema.sql contra DATABASE_URL (.env.local).
 * Uso: npm run db:schema
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { Pool } from "@neondatabase/serverless";

config({ path: ".env.local" });

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("Falta DATABASE_URL en .env.local");
  process.exit(1);
}

const schemaPath = join(dirname(fileURLToPath(import.meta.url)), "..", "sql", "schema.sql");
const sql = readFileSync(schemaPath, "utf8");

const pool = new Pool({ connectionString: url });

async function main() {
  await pool.query(sql);
  console.log("Esquema aplicado: users, posts, post_comments");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
