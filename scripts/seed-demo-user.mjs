/**
 * Inserta un usuario demo para probar POST /api/posts (requiere user_id FK).
 * Uso: npm run db:seed
 */
import { config } from "dotenv";
import { Pool } from "@neondatabase/serverless";

config({ path: ".env.local" });

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("Falta DATABASE_URL en .env.local");
  process.exit(1);
}

const pool = new Pool({ connectionString: url });

const DEMO = {
  username: "demo_goi",
  email: "demo@goi.test",
  password_hash: "bcrypt-not-configured-yet",
};

async function main() {
  await pool.query(
    `INSERT INTO users (username, email, password_hash)
     VALUES ($1, $2, $3)
     ON CONFLICT (email) DO NOTHING`,
    [DEMO.username, DEMO.email, DEMO.password_hash]
  );
  const { rows } = await pool.query(`SELECT id FROM users WHERE email = $1`, [DEMO.email]);
  const id = rows[0]?.id;
  if (!id) {
    console.error("No se pudo obtener el id del usuario demo");
    process.exit(1);
  }
  console.log("Usuario demo listo:");
  console.log(`  email: ${DEMO.email}`);
  console.log(`  userId: ${id}`);
  console.log("\nUsa userId en POST /api/posts (ver docs/api-crud-posts.md)");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
