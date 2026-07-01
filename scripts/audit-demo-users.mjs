/**
 * Lista cuentas demo / de prueba en Neon (no borra).
 * Uso: npm run db:audit-demo-users
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

const DEMO_WHERE = `
  LOWER(email) LIKE '%@test.com'
  OR LOWER(email) LIKE '%@goi.test'
  OR LOWER(username) IN ('demo_goi', 'demo', 'test')
`;

async function main() {
  const { rows } = await pool.query(
    `SELECT id, username, email, email_verified, created_at
     FROM users
     WHERE ${DEMO_WHERE}
     ORDER BY email`
  );

  if (rows.length === 0) {
    console.log("OK: no hay usuarios demo en la base de datos.");
    await pool.end();
    return;
  }

  console.log(`Encontrados ${rows.length} usuario(s) demo / de prueba:`);
  for (const row of rows) {
    console.log(`  - ${row.username} <${row.email}> verified=${row.email_verified}`);
  }
  console.log("\nPara eliminarlos: npm run db:remove-demo-users");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
