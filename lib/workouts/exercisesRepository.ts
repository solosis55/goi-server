import { query } from "@/lib/db";
import { mapExerciseRow, type ExerciseRow } from "@/lib/workouts/mappers";
import type { Exercise } from "@/lib/workouts/types";

const COLS = `id, name, muscles, equipment_tags, equipment, description, instructions`;

export async function listExercises(): Promise<Exercise[]> {
  const rows = await query<ExerciseRow>(`SELECT ${COLS} FROM exercises ORDER BY name ASC`);
  return rows.map(mapExerciseRow);
}

export async function findExerciseById(id: string): Promise<Exercise | null> {
  const rows = await query<ExerciseRow>(`SELECT ${COLS} FROM exercises WHERE id = $1`, [id]);
  const row = rows[0];
  return row ? mapExerciseRow(row) : null;
}

export async function exerciseIdsExist(ids: string[]): Promise<boolean> {
  if (ids.length === 0) return true;
  const rows = await query<{ id: string }>(
    `SELECT id FROM exercises WHERE id = ANY($1::uuid[])`,
    [ids]
  );
  return rows.length === ids.length;
}
