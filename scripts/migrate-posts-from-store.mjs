/**
 * Copia posts y comentarios de Goi Web/server/data/store.json a Neon.
 * Requiere usuarios ya migrados (npm run db:migrate-users).
 * Uso: npm run db:migrate-posts
 */
import { readFileSync } from "node:fs";
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

const storePath = join(__dirname, "..", "..", "Goi Web", "server", "data", "store.json");
const pool = new Pool({ connectionString: url });

const FORMATS = new Set(["standard", "training"]);
const VISIBILITIES = new Set(["public", "followers", "private"]);
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function asUuidOrNull(value) {
  if (value == null || value === "") return null;
  const s = String(value);
  return UUID_RE.test(s) ? s : null;
}

function normalizeMedia(media) {
  if (!Array.isArray(media) || media.length === 0) return null;
  const items = media
    .filter((m) => m && m.type === "image" && typeof m.url === "string" && m.url.length > 0)
    .map((m) => ({ type: "image", url: m.url }));
  return items.length > 0 ? JSON.stringify(items) : null;
}

function clipContent(text, max) {
  const s = String(text ?? "").trim();
  if (!s) return "";
  return s.length <= max ? s : s.slice(0, max);
}

async function ensureMediaColumn() {
  await pool.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS media JSONB`);
}

async function loadUserIds() {
  const { rows } = await pool.query(`SELECT id FROM users`);
  return new Set(rows.map((r) => r.id));
}

async function main() {
  const raw = readFileSync(storePath, "utf8");
  const store = JSON.parse(raw);
  const posts = store.posts ?? [];
  const comments = store.comments ?? [];

  await ensureMediaColumn();
  const userIds = await loadUserIds();

  let postsOk = 0;
  let postsSkip = 0;
  let commentsOk = 0;
  let commentsSkip = 0;

  console.log(`Migrando ${posts.length} post(s) y ${comments.length} comentario(s)…\n`);

  for (const p of posts) {
    if (!p.id || !p.userId) {
      postsSkip += 1;
      console.warn(`  ⚠ post sin id/userId, omitido`);
      continue;
    }
    if (!userIds.has(p.userId)) {
      postsSkip += 1;
      console.warn(`  ⚠ post ${p.id}: usuario ${p.userId} no está en Neon`);
      continue;
    }

    const format = FORMATS.has(p.format) ? p.format : "standard";
    const visibility = VISIBILITIES.has(p.visibility) ? p.visibility : "public";
    const content = clipContent(p.content, 280);
    const sessionId = asUuidOrNull(p.sessionId);
    const media = normalizeMedia(p.media);

    try {
      await pool.query(
        `INSERT INTO posts (id, user_id, content, format, visibility, session_id, media, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, COALESCE($8::timestamptz, NOW()), COALESCE($9::timestamptz, NOW()))
         ON CONFLICT (id) DO UPDATE SET
           user_id = EXCLUDED.user_id,
           content = EXCLUDED.content,
           format = EXCLUDED.format,
           visibility = EXCLUDED.visibility,
           session_id = EXCLUDED.session_id,
           media = EXCLUDED.media,
           created_at = EXCLUDED.created_at,
           updated_at = EXCLUDED.updated_at`,
        [
          p.id,
          p.userId,
          content,
          format,
          visibility,
          sessionId,
          media,
          p.createdAt ?? null,
          p.updatedAt ?? null,
        ]
      );
      postsOk += 1;
      const mediaNote = media ? " + media" : "";
      console.log(`  ✓ post ${p.id.slice(0, 8)}… (${format})${mediaNote}`);
    } catch (err) {
      postsSkip += 1;
      console.warn(`  ⚠ post ${p.id}: ${err.message ?? err}`);
    }
  }

  const postIds = new Set(posts.map((p) => p.id));

  for (const c of comments) {
    if (!c.id || !c.postId || !c.userId) {
      commentsSkip += 1;
      continue;
    }
    if (!postIds.has(c.postId)) {
      commentsSkip += 1;
      console.warn(`  ⚠ comment ${c.id}: post ${c.postId} no en store`);
      continue;
    }
    if (!userIds.has(c.userId)) {
      commentsSkip += 1;
      console.warn(`  ⚠ comment ${c.id}: usuario no en Neon`);
      continue;
    }

    const content = clipContent(c.content, 180);
    if (!content) {
      commentsSkip += 1;
      console.warn(`  ⚠ comment ${c.id}: contenido vacío`);
      continue;
    }

    try {
      await pool.query(
        `INSERT INTO post_comments (id, post_id, user_id, content, created_at, updated_at)
         VALUES ($1, $2, $3, $4, COALESCE($5::timestamptz, NOW()), COALESCE($6::timestamptz, NOW()))
         ON CONFLICT (id) DO UPDATE SET
           post_id = EXCLUDED.post_id,
           user_id = EXCLUDED.user_id,
           content = EXCLUDED.content,
           created_at = EXCLUDED.created_at,
           updated_at = EXCLUDED.updated_at`,
        [c.id, c.postId, c.userId, content, c.createdAt ?? null, c.updatedAt ?? null]
      );
      commentsOk += 1;
      console.log(`  ✓ comment ${c.id.slice(0, 8)}… en post ${c.postId.slice(0, 8)}…`);
    } catch (err) {
      commentsSkip += 1;
      console.warn(`  ⚠ comment ${c.id}: ${err.message ?? err}`);
    }
  }

  console.log(
    `\nListo: ${postsOk} post(s), ${commentsOk} comentario(s). Omitidos: ${postsSkip} post(s), ${commentsSkip} comentario(s).`
  );
  console.log("Los likes del store.json no se migran aún (siguiente paso).");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
