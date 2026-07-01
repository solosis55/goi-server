/**
 * SOLO desarrollo local. Crea 2 usuarios @goi.test con posts de ejemplo.
 *
 * Requiere: CONFIRM_DEMO_SEED=1 en el entorno (evita ejecución accidental).
 * No usar en Neon prod compartida: npm run db:audit-demo-users / db:remove-demo-users
 *
 * Uso:
 *   CONFIRM_DEMO_SEED=1 npm run db:seed-feed-demos
 *
 * Cuentas (password: DemoGoi2026!):
 *   demo_alpha@goi.test / demo_alpha
 *   demo_beta@goi.test / demo_beta
 *
 * Genera ~20 posts por usuario (40 en total) para probar paginación feed (checklist 2.2).
 */
import { config } from "dotenv";
import bcrypt from "bcryptjs";
import { Pool } from "@neondatabase/serverless";

config({ path: ".env.local" });

if (process.env.CONFIRM_DEMO_SEED !== "1") {
  console.error(
    "Abortado: define CONFIRM_DEMO_SEED=1 para confirmar (solo desarrollo local).\n" +
      "  PowerShell: $env:CONFIRM_DEMO_SEED=1; npm run db:seed-feed-demos"
  );
  process.exit(1);
}

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("Falta DATABASE_URL en .env.local");
  process.exit(1);
}

const DEMO_PASSWORD = "DemoGoi2026!";
const POSTS_PER_USER = 20;
const USERS = [
  { username: "demo_alpha", email: "demo_alpha@goi.test" },
  { username: "demo_beta", email: "demo_beta@goi.test" },
];

const pool = new Pool({ connectionString: url });

async function upsertUser(username, email, passwordHash) {
  await pool.query(
    `INSERT INTO users (username, email, password_hash, email_verified)
     VALUES ($1, $2, $3, TRUE)
     ON CONFLICT (email) DO UPDATE SET
       username = EXCLUDED.username,
       password_hash = EXCLUDED.password_hash,
       email_verified = TRUE,
       updated_at = NOW()`,
    [username, email, passwordHash]
  );
  const { rows } = await pool.query(`SELECT id FROM users WHERE email = $1`, [email]);
  return rows[0]?.id;
}

async function ensurePost(userId, content, minutesAgo) {
  const { rows: existing } = await pool.query(
    `SELECT id FROM posts WHERE user_id = $1 AND content = $2 LIMIT 1`,
    [userId, content]
  );
  if (existing[0]?.id) return { id: existing[0].id, created: false };
  const { rows } = await pool.query(
    `INSERT INTO posts (user_id, content, format, visibility, created_at, updated_at)
     VALUES ($1, $2, 'standard', 'public', NOW() - ($3::int * INTERVAL '1 minute'), NOW() - ($3::int * INTERVAL '1 minute'))
     RETURNING id`,
    [userId, content, minutesAgo]
  );
  return { id: rows[0]?.id, created: true };
}

async function ensureFollow(followerId, followingId) {
  await pool.query(
    `INSERT INTO follows (follower_id, following_id, status)
     VALUES ($1, $2, 'active')
     ON CONFLICT (follower_id, following_id) DO UPDATE SET status = 'active'`,
    [followerId, followingId]
  );
}

async function seedUserPosts(userId, username) {
  let created = 0;
  for (let i = 1; i <= POSTS_PER_USER; i++) {
    const minutesAgo = i + (username === "demo_beta" ? POSTS_PER_USER : 0);
    const content = `[${username}] Publicación demo #${i} — prueba paginación feed (2.2).`;
    const { created: isNew } = await ensurePost(userId, content, minutesAgo);
    if (isNew) created++;
  }
  return created;
}

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const ids = [];
  let totalCreated = 0;
  for (const u of USERS) {
    const id = await upsertUser(u.username, u.email, passwordHash);
    if (!id) throw new Error(`No se pudo crear ${u.email}`);
    ids.push(id);
    const created = await seedUserPosts(id, u.username);
    totalCreated += created;
    console.log(`✓ ${u.username} (${u.email}) id=${id} — ${created} posts nuevos`);
  }
  if (ids.length === 2) {
    await ensureFollow(ids[0], ids[1]);
    await ensureFollow(ids[1], ids[0]);
    console.log("✓ Seguimiento mutuo demo_alpha ↔ demo_beta");
  }
  console.log(`\nTotal posts demo por usuario: ${POSTS_PER_USER} (${POSTS_PER_USER * USERS.length} en feed «Todos»)`);
  console.log(`Posts insertados en esta ejecución: ${totalCreated}`);
  console.log(`Password común: ${DEMO_PASSWORD}`);
  console.log("Prueba login Web/App, feed scope Seguidos / Todos y «Cargar más» (2.2).");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
