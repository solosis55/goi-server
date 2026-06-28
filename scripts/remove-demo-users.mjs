/**
 * Elimina cuentas demo (*@test.com) excepto cristian@test.com.
 * Uso: npm run db:remove-demo-users
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { Pool } from "@neondatabase/serverless";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "..", ".env.local") });

const KEEP_EMAIL = "cristian@test.com";

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("Falta DATABASE_URL en .env.local");
  process.exit(1);
}

const pool = new Pool({ connectionString: url });

async function main() {
  const { rows } = await pool.query(
    `SELECT id, email, username FROM users
     WHERE LOWER(email) LIKE '%@test.com'
       AND LOWER(email) != LOWER($1)`,
    [KEEP_EMAIL]
  );

  if (rows.length === 0) {
    console.log("No hay usuarios demo que eliminar.");
    await pool.end();
    return;
  }

  console.log(`Eliminando ${rows.length} usuario(s) demo:`);
  for (const row of rows) {
    console.log(`  - ${row.username} (${row.email})`);
    await pool.query(`DELETE FROM users WHERE id = $1`, [row.id]);
  }

  console.log(`Listo. Conservado: ${KEEP_EMAIL}`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
