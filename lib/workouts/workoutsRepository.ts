import { query } from "@/lib/db";
import {
  blocksFromExerciseIdsOnly,
  sanitizeExerciseBlocksPayload,
  sanitizeExerciseIds,
} from "@/lib/workouts/exerciseBlocks";
import { MAX_WORKOUT_EXERCISES } from "@/lib/workouts/constants";
import { mapWorkoutRow, type WorkoutRow } from "@/lib/workouts/mappers";
import type { Workout, WorkoutExerciseBlock } from "@/lib/workouts/types";
import { exerciseIdsExist } from "@/lib/workouts/exercisesRepository";
import { isLengthBetween, sanitizeText, sanitizeWorkoutTags } from "@/lib/validation/text";

const COLS = `id, user_id, title, description, exercise_ids, exercise_blocks, tags, created_at, updated_at`;

type WorkoutPayload = {
  title?: string;
  description?: string;
  exerciseIds?: string[];
  exerciseBlocks?: unknown;
  tags?: string[];
};

function resolveExercisePayload(body: WorkoutPayload): {
  exerciseBlocks: WorkoutExerciseBlock[];
  exerciseIds: string[];
} | null {
  const rawBlocks = body.exerciseBlocks;
  if (Array.isArray(rawBlocks) && rawBlocks.length > 0) {
    const blocks = sanitizeExerciseBlocksPayload(rawBlocks);
    if (blocks && blocks.length > 0) {
      return { exerciseBlocks: blocks, exerciseIds: blocks.map((b) => b.exerciseId) };
    }
  }
  const ids = sanitizeExerciseIds(body.exerciseIds);
  return { exerciseBlocks: blocksFromExerciseIdsOnly(ids), exerciseIds: ids };
}

async function validateExerciseIds(ids: string[]): Promise<boolean> {
  if (ids.length > MAX_WORKOUT_EXERCISES) return false;
  return exerciseIdsExist(ids);
}

export async function listWorkouts(): Promise<Workout[]> {
  const rows = await query<WorkoutRow>(`SELECT ${COLS} FROM workouts ORDER BY created_at DESC`);
  return rows.map(mapWorkoutRow);
}

export async function findWorkoutById(id: string): Promise<Workout | null> {
  const rows = await query<WorkoutRow>(`SELECT ${COLS} FROM workouts WHERE id = $1`, [id]);
  const row = rows[0];
  return row ? mapWorkoutRow(row) : null;
}

export async function createWorkout(userId: string, body: WorkoutPayload): Promise<Workout | "invalid"> {
  const title = sanitizeText(body.title);
  const description = sanitizeText(body.description ?? "");
  const resolved = resolveExercisePayload(body);
  if (!resolved || !isLengthBetween(title, 3, 80)) return "invalid";
  if (description.length > 280) return "invalid";
  if (!(await validateExerciseIds(resolved.exerciseIds))) return "invalid";

  const tags = sanitizeWorkoutTags(body.tags ?? []);
  const id = crypto.randomUUID();
  const rows = await query<WorkoutRow>(
    `INSERT INTO workouts (id, user_id, title, description, exercise_ids, exercise_blocks, tags)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb)
     RETURNING ${COLS}`,
    [
      id,
      userId,
      title,
      description,
      JSON.stringify(resolved.exerciseIds),
      JSON.stringify(resolved.exerciseBlocks),
      JSON.stringify(tags),
    ]
  );
  const row = rows[0];
  return row ? mapWorkoutRow(row) : "invalid";
}

export async function updateWorkout(
  id: string,
  userId: string,
  body: WorkoutPayload
): Promise<Workout | "not_found" | "forbidden" | "invalid"> {
  const existing = await findWorkoutById(id);
  if (!existing) return "not_found";
  if (existing.userId !== userId) return "forbidden";

  let title = existing.title;
  let description = existing.description;
  let exerciseIds = existing.exerciseIds;
  let exerciseBlocks = existing.exerciseBlocks;
  let tags = existing.tags;

  if (body.title !== undefined) {
    const t = sanitizeText(body.title);
    if (!isLengthBetween(t, 3, 80)) return "invalid";
    title = t;
  }
  if (body.description !== undefined) {
    const d = sanitizeText(body.description);
    if (d.length > 280) return "invalid";
    description = d;
  }
  if (body.exerciseBlocks !== undefined || body.exerciseIds !== undefined) {
    if (body.exerciseBlocks !== undefined && Array.isArray(body.exerciseBlocks) && body.exerciseBlocks.length === 0) {
      exerciseIds = [];
      exerciseBlocks = [];
    } else {
      const resolved = resolveExercisePayload(body);
      if (!resolved) return "invalid";
      exerciseIds = resolved.exerciseIds;
      exerciseBlocks = resolved.exerciseBlocks;
    }
    if (!(await validateExerciseIds(exerciseIds))) return "invalid";
  }
  if (body.tags !== undefined) {
    tags = sanitizeWorkoutTags(body.tags);
  }

  const rows = await query<WorkoutRow>(
    `UPDATE workouts SET
       title = $3, description = $4, exercise_ids = $5::jsonb,
       exercise_blocks = $6::jsonb, tags = $7::jsonb, updated_at = NOW()
     WHERE id = $1 AND user_id = $2
     RETURNING ${COLS}`,
    [
      id,
      userId,
      title,
      description,
      JSON.stringify(exerciseIds),
      JSON.stringify(exerciseBlocks),
      JSON.stringify(tags),
    ]
  );
  const row = rows[0];
  return row ? mapWorkoutRow(row) : "invalid";
}

export async function deleteWorkout(
  id: string,
  userId: string
): Promise<Workout | "not_found" | "forbidden"> {
  const existing = await findWorkoutById(id);
  if (!existing) return "not_found";
  if (existing.userId !== userId) return "forbidden";

  await query(`DELETE FROM workouts WHERE id = $1`, [id]);
  return existing;
}
