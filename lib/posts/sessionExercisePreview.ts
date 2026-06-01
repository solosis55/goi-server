import {
  parseExercisePreviewsFromNotes,
  type SessionExercisePreviewDto,
} from "@/lib/posts/sessionNotesPreview";

export type { SessionExercisePreviewDto };

type SnapshotSet = {
  done?: boolean;
  actualReps?: string;
  actualWeight?: string;
};

type SnapshotBlock = {
  exerciseName?: string;
  sets?: SnapshotSet[];
};

export type WorkoutSessionSnapshot = {
  workoutTitle?: string;
  completedSets?: number;
  totalSets?: number;
  completedExercises?: number;
  totalExercises?: number;
  blocks?: SnapshotBlock[];
};

function formatSetBrief(set: SnapshotSet): string {
  if (!set.done) return "";
  const w = String(set.actualWeight ?? "").trim();
  const r = String(set.actualReps ?? "").trim();
  if (w && r) return `${w} kg × ${r}`;
  if (r) return `${r} reps`;
  return "✓";
}

function summarizeBlock(block: SnapshotBlock): string {
  const sets = block.sets ?? [];
  const total = sets.length;
  const done = sets.filter((s) => s.done);
  if (total === 0) return "";
  if (done.length === 0) return `${total} series`;
  const lastDone = done[done.length - 1];
  const lastLabel = formatSetBrief(lastDone);
  if (done.length === 1 && lastLabel) return lastLabel;
  if (lastLabel) return `${done.length}/${total} ser. · ${lastLabel}`;
  return `${done.length}/${total} series`;
}

export function buildSessionExercisePreviews(
  snapshot?: WorkoutSessionSnapshot | null,
  maxExercises = 3
): SessionExercisePreviewDto[] {
  if (!snapshot?.blocks?.length) return [];
  return snapshot.blocks.slice(0, maxExercises).map((block) => ({
    exerciseName: block.exerciseName ?? "Ejercicio",
    summary: summarizeBlock(block),
  }));
}

export function countRemainingExercisePreviews(
  shown: number,
  snapshot?: WorkoutSessionSnapshot | null
): number {
  const total = snapshot?.blocks?.length ?? 0;
  return Math.max(0, total - shown);
}

export function resolveSessionExercisePreviews(input: {
  snapshot?: WorkoutSessionSnapshot | null;
  previews?: SessionExercisePreviewDto[] | null;
  notes?: string | null;
  maxExercises?: number;
}): SessionExercisePreviewDto[] {
  const max = input.maxExercises ?? 3;
  const fromSnapshot = buildSessionExercisePreviews(input.snapshot, max);
  if (fromSnapshot.length > 0) return fromSnapshot;
  if (input.previews && input.previews.length > 0) return input.previews.slice(0, max);
  return parseExercisePreviewsFromNotes(input.notes, max);
}

export function resolveSessionMoreExercisesCount(input: {
  snapshot?: WorkoutSessionSnapshot | null;
  previews?: SessionExercisePreviewDto[] | null;
  notes?: string | null;
  shown: number;
}): number {
  const totalFromSnapshot = input.snapshot?.blocks?.length ?? 0;
  if (totalFromSnapshot > 0) return countRemainingExercisePreviews(input.shown, input.snapshot);
  const fromNotes = parseExercisePreviewsFromNotes(input.notes, 99).length;
  return Math.max(0, fromNotes - input.shown);
}
