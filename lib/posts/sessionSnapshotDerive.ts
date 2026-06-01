import { parseSeriesFromNotes } from "@/lib/posts/sessionNotesPreview";
import type { WorkoutExerciseBlock } from "@/lib/workouts/types";
import type { WorkoutSessionSnapshot } from "@/lib/posts/sessionExercisePreview";

function parseExerciseBlocks(raw: unknown): WorkoutExerciseBlock[] {
  if (!Array.isArray(raw)) return [];
  return raw as WorkoutExerciseBlock[];
}

function parseExerciseIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string");
}

function normalizeSnapshotBlocks(raw: unknown): WorkoutSessionSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const blocks = (o.blocks ?? o.exerciseBlocks) as WorkoutSessionSnapshot["blocks"] | undefined;
  if (!blocks?.length) return null;
  return {
    workoutTitle: typeof o.workoutTitle === "string" ? o.workoutTitle : undefined,
    completedSets: typeof o.completedSets === "number" ? o.completedSets : undefined,
    totalSets: typeof o.totalSets === "number" ? o.totalSets : undefined,
    completedExercises: typeof o.completedExercises === "number" ? o.completedExercises : undefined,
    totalExercises: typeof o.totalExercises === "number" ? o.totalExercises : undefined,
    blocks,
  };
}

/**
 * Snapshot sintético para sesiones sin `snapshot.blocks` en BD:
 * nombres desde la rutina + totales en notes.
 */
export function deriveSessionSnapshotForDisplay(input: {
  snapshot: unknown;
  notes: string;
  workoutTitle: string | null;
  exerciseBlocks: unknown;
  exerciseIds: unknown;
  exerciseNamesById: Map<string, string>;
}): WorkoutSessionSnapshot | null {
  const persisted = normalizeSnapshotBlocks(input.snapshot);
  if (persisted?.blocks?.length) return persisted;

  const blocksFromWorkout = parseExerciseBlocks(input.exerciseBlocks);
  const idsFromWorkout = parseExerciseIds(input.exerciseIds);
  if (blocksFromWorkout.length === 0 && idsFromWorkout.length === 0) return null;

  const series = parseSeriesFromNotes(input.notes);
  const nameFor = (id: string) => input.exerciseNamesById.get(id)?.trim() || "Ejercicio";

  const blocks =
    blocksFromWorkout.length > 0
      ? blocksFromWorkout.map((block) => {
          const setCount = block.sets?.length ?? 0;
          return {
            exerciseId: block.exerciseId,
            exerciseName: nameFor(block.exerciseId),
            sets: Array.from({ length: setCount }, () => ({
              done: true,
              actualReps: "",
              actualWeight: "",
            })),
          };
        })
      : idsFromWorkout.map((exerciseId) => ({
          exerciseId,
          exerciseName: nameFor(exerciseId),
          sets: [] as NonNullable<WorkoutSessionSnapshot["blocks"]>[number]["sets"],
        }));

  const totalSetsFromBlocks = blocks.reduce((sum, b) => sum + (b.sets?.length ?? 0), 0);
  const totalSets = series?.total ?? totalSetsFromBlocks;
  const completedSets = series?.completed ?? totalSets;
  const totalExercises = blocks.length;
  const completedExercises = totalExercises;

  return {
    workoutTitle: input.workoutTitle?.trim() || undefined,
    completedSets,
    totalSets,
    completedExercises,
    totalExercises,
    blocks,
  };
}
