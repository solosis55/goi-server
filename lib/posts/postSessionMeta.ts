import { query } from "@/lib/db";
import { deriveSessionSnapshotForDisplay } from "@/lib/posts/sessionSnapshotDerive";
import {
  resolveSessionExercisePreviews,
  resolveSessionMoreExercisesCount,
  type SessionExercisePreviewDto,
} from "@/lib/posts/sessionExercisePreview";
import type { ClientPost } from "@/lib/types/clientPost";

export type PostSessionMetaFields = {
  sessionWorkoutTitle: string | null;
  sessionPerformedAt: string | null;
  sessionCompletedSets: number | null;
  sessionTotalSets: number | null;
  sessionCompletedExercises: number | null;
  sessionTotalExercises: number | null;
  sessionExercisePreviews: SessionExercisePreviewDto[];
  sessionMoreExercisesCount: number;
};

const emptyMeta: PostSessionMetaFields = {
  sessionWorkoutTitle: null,
  sessionPerformedAt: null,
  sessionCompletedSets: null,
  sessionTotalSets: null,
  sessionCompletedExercises: null,
  sessionTotalExercises: null,
  sessionExercisePreviews: [],
  sessionMoreExercisesCount: 0,
};

type SessionJoinRow = {
  id: string;
  performed_at: string;
  notes: string;
  snapshot: unknown;
  workout_title: string | null;
  exercise_blocks: unknown;
  exercise_ids: unknown;
};

function collectExerciseIds(rows: SessionJoinRow[]): string[] {
  const ids = new Set<string>();
  for (const row of rows) {
    const snap = row.snapshot && typeof row.snapshot === "object" ? (row.snapshot as { blocks?: { exerciseId?: string }[] }) : null;
    for (const block of snap?.blocks ?? []) {
      if (typeof block.exerciseId === "string") ids.add(block.exerciseId);
    }
    if (Array.isArray(row.exercise_blocks)) {
      for (const block of row.exercise_blocks as { exerciseId?: string }[]) {
        if (typeof block.exerciseId === "string") ids.add(block.exerciseId);
      }
    }
    if (Array.isArray(row.exercise_ids)) {
      for (const id of row.exercise_ids) {
        if (typeof id === "string") ids.add(id);
      }
    }
  }
  return [...ids];
}

async function loadExerciseNames(ids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (ids.length === 0) return map;
  const rows = await query<{ id: string; name: string }>(
    `SELECT id, name FROM exercises WHERE id = ANY($1::uuid[])`,
    [ids]
  );
  for (const row of rows) {
    map.set(row.id, row.name);
  }
  return map;
}

function metaFromRow(row: SessionJoinRow, exerciseNamesById: Map<string, string>): PostSessionMetaFields {
  const snap = deriveSessionSnapshotForDisplay({
    snapshot: row.snapshot,
    notes: row.notes ?? "",
    workoutTitle: row.workout_title,
    exerciseBlocks: row.exercise_blocks,
    exerciseIds: row.exercise_ids,
    exerciseNamesById,
  });

  const previews = resolveSessionExercisePreviews({
    snapshot: snap,
    notes: row.notes,
  });
  const workoutTitle =
    snap?.workoutTitle?.trim() || row.workout_title?.trim() || "Entrenamiento";

  return {
    sessionWorkoutTitle: workoutTitle,
    sessionPerformedAt: row.performed_at,
    sessionCompletedSets: snap?.completedSets ?? null,
    sessionTotalSets: snap?.totalSets ?? null,
    sessionCompletedExercises: snap?.completedExercises ?? null,
    sessionTotalExercises: snap?.totalExercises ?? null,
    sessionExercisePreviews: previews,
    sessionMoreExercisesCount: resolveSessionMoreExercisesCount({
      snapshot: snap,
      notes: row.notes,
      shown: previews.length,
    }),
  };
}

/** Añade preview de entreno a posts con `sessionId` (feed, detalle, perfil). */
export async function enrichPostsWithSessionMeta(posts: ClientPost[]): Promise<ClientPost[]> {
  const sessionIds = [
    ...new Set(posts.map((p) => p.sessionId).filter((id): id is string => Boolean(id))),
  ];
  if (sessionIds.length === 0) return posts;

  const rows = await query<SessionJoinRow>(
    `SELECT s.id, s.performed_at, s.notes, s.snapshot, w.title AS workout_title,
            w.exercise_blocks, w.exercise_ids
     FROM workout_sessions s
     LEFT JOIN workouts w ON w.id = s.workout_id
     WHERE s.id = ANY($1::uuid[])`,
    [sessionIds]
  );

  const exerciseNamesById = await loadExerciseNames(collectExerciseIds(rows));
  const byId = new Map(rows.map((r) => [r.id, metaFromRow(r, exerciseNamesById)]));

  return posts.map((post) => {
    if (!post.sessionId) return post;
    const meta = byId.get(post.sessionId);
    if (!meta) return post;
    return { ...post, ...meta };
  });
}

export function emptyPostSessionMeta(): PostSessionMetaFields {
  return { ...emptyMeta, sessionExercisePreviews: [] };
}
