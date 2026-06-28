import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { Pool } from "@neondatabase/serverless";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "..", ".env.local") });

const email = process.argv[2]?.trim();
if (!email) {
  console.error("Uso: node scripts/delete-user-by-email.mjs EMAIL");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const r = await pool.query(
  "DELETE FROM users WHERE LOWER(email) = LOWER($1) RETURNING username, email",
  [email]
);
if (r.rowCount) {
  console.log(`Eliminada: ${r.rows[0].username} (${r.rows[0].email})`);
} else {
  console.log("No había cuenta con ese email");
}
await pool.end();
