/**
 * Convierte media JSONB con data:image/...;base64 en ficheros bajo uploads/posts/
 * y actualiza posts.media a rutas cortas /uploads/posts/{id}/{n}.jpg
 *
 * Uso: npm run db:migrate-post-media
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { Pool } from "@neondatabase/serverless";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "..", ".env.local") });

const dbUrl = process.env.DATABASE_URL?.trim();
if (!dbUrl) {
  console.error("Falta DATABASE_URL en .env.local");
  process.exit(1);
}

const DATA_IMAGE_RE = /^data:image\/([\w+.-]+);base64,([\s\S]+)$/;

function getUploadsRoot() {
  const env = process.env.GOI_UPLOADS_PATH?.trim();
  if (env) return resolve(env);
  return join(__dirname, "..", "..", "Goi Web", "server", "data", "uploads");
}

function extForSubtype(subtype) {
  const s = subtype.toLowerCase();
  if (s === "png") return ".png";
  if (s === "webp") return ".webp";
  return ".jpg";
}

function writePostFile(postsDir, postId, index, buffer, ext) {
  const dir = join(postsDir, postId);
  mkdirSync(dir, { recursive: true });
  const filename = `${index}${ext}`;
  writeFileSync(join(dir, filename), buffer);
  return `/uploads/posts/${postId}/${filename}`;
}

function persistPostMedia(postId, media, postsDir) {
  if (!Array.isArray(media) || media.length === 0) return [];

  const out = [];
  for (let i = 0; i < media.length; i++) {
    const item = media[i];
    if (!item || item.type !== "image" || typeof item.url !== "string") continue;

    const url = item.url.trim();
    if (!url) continue;

    if (url.startsWith("/uploads/posts/")) {
      out.push({ type: "image", url });
      continue;
    }

    if (url.startsWith("data:image")) {
      const m = DATA_IMAGE_RE.exec(url);
      if (!m) {
        console.warn(`  ⚠ ${postId}[${i}]: data URL no válida, omitida`);
        continue;
      }
      const ext = extForSubtype(m[1]);
      const buffer = Buffer.from(m[2], "base64");
      if (buffer.length === 0) {
        console.warn(`  ⚠ ${postId}[${i}]: base64 vacío, omitida`);
        continue;
      }
      const pathname = writePostFile(postsDir, postId, i, buffer, ext);
      out.push({ type: "image", url: pathname });
      continue;
    }

    if (url.startsWith("http://") || url.startsWith("https://")) {
      out.push({ type: "image", url });
    }
  }

  return out;
}

function mediaHasDataUrl(media) {
  return (
    Array.isArray(media) &&
    media.some(
      (m) =>
        m &&
        m.type === "image" &&
        typeof m.url === "string" &&
        m.url.trim().toLowerCase().startsWith("data:")
    )
  );
}

const pool = new Pool({ connectionString: dbUrl });
const postsDir = join(getUploadsRoot(), "posts");
mkdirSync(postsDir, { recursive: true });

async function main() {
  const { rows } = await pool.query(`SELECT id, media FROM posts WHERE media IS NOT NULL`);
  let scanned = 0;
  let updated = 0;
  let skipped = 0;

  console.log(`Revisando ${rows.length} post(s) con media…\n`);

  for (const row of rows) {
    scanned += 1;
    const media = row.media;
    if (!mediaHasDataUrl(media)) {
      skipped += 1;
      continue;
    }

    const stored = persistPostMedia(row.id, media, postsDir);
    const json = stored.length > 0 ? JSON.stringify(stored) : null;
    await pool.query(`UPDATE posts SET media = $2::jsonb WHERE id = $1`, [row.id, json]);
    updated += 1;
    console.log(`  ✓ ${row.id} → ${stored.length} imagen(es) en disco`);
  }

  console.log(`\nListo: ${updated} actualizado(s), ${skipped} sin data URL, ${scanned} revisado(s).`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
