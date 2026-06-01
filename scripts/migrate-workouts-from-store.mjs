/**
 * Migra exercises, workouts y workoutSessions desde store.json a Neon.
 * Uso: npm run db:migrate-workouts
 */
import { execSync } from "node:child_process";
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

async function ensureTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS exercises (
      id UUID PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      muscles JSONB NOT NULL DEFAULT '[]'::jsonb,
      equipment_tags JSONB NOT NULL DEFAULT '[]'::jsonb,
      equipment TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      instructions TEXT NOT NULL DEFAULT ''
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS workouts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(80) NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      exercise_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
      exercise_blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
      tags JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS workout_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
      performed_at TIMESTAMPTZ NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      snapshot JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function main() {
  execSync("node scripts/ensure-user-profile-columns.mjs", {
    cwd: join(__dirname, ".."),
    stdio: "inherit",
  });
  await ensureTables();

  const store = JSON.parse(readFileSync(storePath, "utf8"));
  const { rows: users } = await pool.query(`SELECT id FROM users`);
  const userIds = new Set(users.map((r) => r.id));

  let exOk = 0;
  for (const e of store.exercises ?? []) {
    if (!e.id || !e.name) continue;
    try {
      await pool.query(
        `INSERT INTO exercises (id, name, muscles, equipment_tags, equipment, description, instructions)
         VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           muscles = EXCLUDED.muscles,
           equipment_tags = EXCLUDED.equipment_tags,
           equipment = EXCLUDED.equipment,
           description = EXCLUDED.description,
           instructions = EXCLUDED.instructions`,
        [
          e.id,
          String(e.name).slice(0, 120),
          JSON.stringify(e.muscles ?? []),
          JSON.stringify(e.equipmentTags ?? []),
          e.equipment ?? "",
          e.description ?? "",
          e.instructions ?? "",
        ]
      );
      exOk += 1;
    } catch (err) {
      console.warn(`  ⚠ exercise ${e.id}: ${err.message ?? err}`);
    }
  }
  console.log(`Ejercicios: ${exOk}`);

  let wOk = 0;
  for (const w of store.workouts ?? []) {
    if (!w.id || !w.userId || !userIds.has(w.userId)) continue;
    try {
      await pool.query(
        `INSERT INTO workouts (id, user_id, title, description, exercise_ids, exercise_blocks, tags, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, COALESCE($8::timestamptz, NOW()), COALESCE($9::timestamptz, NOW()))
         ON CONFLICT (id) DO UPDATE SET
           title = EXCLUDED.title,
           description = EXCLUDED.description,
           exercise_ids = EXCLUDED.exercise_ids,
           exercise_blocks = EXCLUDED.exercise_blocks,
           tags = EXCLUDED.tags,
           updated_at = EXCLUDED.updated_at`,
        [
          w.id,
          w.userId,
          String(w.title).slice(0, 80),
          w.description ?? "",
          JSON.stringify(w.exerciseIds ?? []),
          JSON.stringify(w.exerciseBlocks ?? []),
          JSON.stringify(w.tags ?? []),
          w.createdAt ?? null,
          w.updatedAt ?? null,
        ]
      );
      wOk += 1;
      console.log(`  ✓ workout ${w.title}`);
    } catch (err) {
      console.warn(`  ⚠ workout ${w.id}: ${err.message ?? err}`);
    }
  }

  let sOk = 0;
  for (const s of store.workoutSessions ?? []) {
    if (!s.id || !s.userId || !s.workoutId) continue;
    if (!userIds.has(s.userId)) continue;
    try {
      await pool.query(
        `INSERT INTO workout_sessions (id, user_id, workout_id, performed_at, notes, snapshot, created_at)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, COALESCE($7::timestamptz, NOW()))
         ON CONFLICT (id) DO UPDATE SET
           performed_at = EXCLUDED.performed_at,
           notes = EXCLUDED.notes,
           snapshot = EXCLUDED.snapshot`,
        [
          s.id,
          s.userId,
          s.workoutId,
          s.performedAt ?? new Date().toISOString(),
          s.notes ?? "",
          s.snapshot != null ? JSON.stringify(s.snapshot) : null,
          s.createdAt ?? null,
        ]
      );
      sOk += 1;
      console.log(`  ✓ session ${s.id.slice(0, 8)}…`);
    } catch (err) {
      console.warn(`  ⚠ session ${s.id}: ${err.message ?? err}`);
    }
  }

  console.log(`\nListo: ${exOk} ejercicios, ${wOk} rutinas, ${sOk} sesiones.`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
