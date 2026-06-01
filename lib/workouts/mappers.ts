import type {
  Exercise,
  Workout,
  WorkoutSession,
  WorkoutSessionDetail,
  WorkoutSessionWithTitle,
} from "@/lib/workouts/types";

export type ExerciseRow = {
  id: string;
  name: string;
  muscles: unknown;
  equipment_tags: unknown;
  equipment: string;
  description: string;
  instructions: string;
};

export type WorkoutRow = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  exercise_ids: unknown;
  exercise_blocks: unknown;
  tags: unknown;
  created_at: string;
  updated_at: string;
};

export type SessionRow = {
  id: string;
  user_id: string;
  workout_id: string;
  performed_at: string;
  notes: string;
  snapshot: unknown;
  created_at: string;
  workout_title?: string;
  author_username?: string;
  author_avatar_url?: string;
};

function parseStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string");
}

function parseBlocks(raw: unknown): Workout["exerciseBlocks"] {
  if (!Array.isArray(raw)) return [];
  return raw as Workout["exerciseBlocks"];
}

export function mapExerciseRow(row: ExerciseRow): Exercise {
  return {
    id: row.id,
    name: row.name,
    muscles: parseStringArray(row.muscles),
    equipmentTags: parseStringArray(row.equipment_tags),
    equipment: row.equipment ?? "",
    description: row.description ?? "",
    instructions: row.instructions ?? "",
  };
}

export function mapWorkoutRow(row: WorkoutRow): Workout {
  const exerciseBlocks = parseBlocks(row.exercise_blocks);
  const exerciseIds = parseStringArray(row.exercise_ids);
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description ?? "",
    exerciseIds: exerciseIds.length > 0 ? exerciseIds : exerciseBlocks.map((b) => b.exerciseId),
    exerciseBlocks,
    tags: parseStringArray(row.tags),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapSessionRow(row: SessionRow): WorkoutSession {
  return {
    id: row.id,
    userId: row.user_id,
    workoutId: row.workout_id,
    performedAt: row.performed_at,
    notes: row.notes ?? "",
    ...(row.snapshot != null ? { snapshot: row.snapshot } : {}),
    createdAt: row.created_at,
  };
}

export function mapSessionWithTitle(row: SessionRow): WorkoutSessionWithTitle {
  const base = mapSessionRow(row);
  const snapshot = row.snapshot as { workoutTitle?: string } | null | undefined;
  const titleFromSnapshot =
    snapshot && typeof snapshot === "object" && typeof snapshot.workoutTitle === "string"
      ? snapshot.workoutTitle
      : undefined;
  return {
    ...base,
    workoutTitle: row.workout_title ?? titleFromSnapshot ?? "(Entrenamiento eliminado)",
  };
}

export function mapSessionDetail(row: SessionRow): WorkoutSessionDetail {
  return {
    ...mapSessionWithTitle(row),
    authorUsername: row.author_username ?? "Usuario",
    authorAvatarUrl: row.author_avatar_url ?? "",
  };
}
