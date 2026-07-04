import { deriveSessionSnapshotForDisplay } from "@/lib/posts/sessionSnapshotDerive";
import { query } from "@/lib/db";
import type { SessionRow } from "@/lib/workouts/mappers";

export type SessionPickerRoutineOption = {
  workoutId: string;
  workoutTitle: string;
  sessionCount: number;
};

export type SessionPickerItem = {
  id: string;
  userId: string;
  workoutId: string;
  performedAt: string;
  notes: string;
  createdAt: string;
  workoutTitle: string;
  snapshot?: unknown;
  linkedPostId: string | null;
};

export type SessionPickerQueryInput = {
  userId: string;
  q?: string;
  workoutId?: string;
  from?: string;
  to?: string;
  cursor?: string;
  limit?: number;
  includeLinked?: boolean;
};

export type SessionPickerQueryResult = {
  sessions: SessionPickerItem[];
  nextCursor: string | null;
  hasMore: boolean;
  routineOptions: SessionPickerRoutineOption[];
};

type PickerDbRow = SessionRow & {
  workout_title: string | null;
  exercise_blocks: unknown;
  exercise_ids: unknown;
};

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 50;

function sessionHaystack(row: SessionPickerItem): string {
  const parts = [row.workoutTitle, row.notes ?? ""];
  const snap = row.snapshot as { blocks?: { exerciseName?: string }[] } | null | undefined;
  for (const block of snap?.blocks ?? []) {
    if (block.exerciseName) parts.push(block.exerciseName);
  }
  return parts.join(" ").toLowerCase();
}

function compareSessions(a: SessionPickerItem, b: SessionPickerItem): number {
  const ta = Date.parse(a.performedAt);
  const tb = Date.parse(b.performedAt);
  if (tb !== ta) return tb - ta;
  return b.id.localeCompare(a.id);
}

function encodeCursor(session: SessionPickerItem): string {
  return `${session.performedAt}|${session.id}`;
}

function isBeforeCursor(session: SessionPickerItem, cursor: string): boolean {
  const [performedAt, id] = cursor.split("|");
  if (!performedAt || !id) return true;
  const ta = Date.parse(session.performedAt);
  const tb = Date.parse(performedAt);
  if (ta < tb) return true;
  if (ta > tb) return false;
  return session.id < id;
}

function collectExerciseIds(rows: PickerDbRow[]): string[] {
  const ids = new Set<string>();
  for (const row of rows) {
    const snap = row.snapshot as { blocks?: { exerciseId?: string }[] } | null | undefined;
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
  for (const row of rows) map.set(row.id, row.name);
  return map;
}

function mapPickerRow(
  row: PickerDbRow,
  linkedPostId: string | null,
  exerciseNames: Map<string, string>
): SessionPickerItem {
  const workoutTitle =
    row.workout_title?.trim() ||
    (typeof row.snapshot === "object" &&
    row.snapshot &&
    typeof (row.snapshot as { workoutTitle?: string }).workoutTitle === "string"
      ? (row.snapshot as { workoutTitle: string }).workoutTitle
      : "(Entrenamiento eliminado)");

  const snapshot = deriveSessionSnapshotForDisplay({
    snapshot: row.snapshot,
    notes: row.notes ?? "",
    workoutTitle,
    exerciseBlocks: row.exercise_blocks,
    exerciseIds: row.exercise_ids,
    exerciseNamesById: exerciseNames,
  });

  return {
    id: row.id,
    userId: row.user_id,
    workoutId: row.workout_id,
    performedAt: row.performed_at,
    notes: row.notes ?? "",
    createdAt: row.created_at,
    workoutTitle,
    ...(snapshot ? { snapshot } : {}),
    linkedPostId,
  };
}

function buildRoutineOptions(rows: SessionPickerItem[]): SessionPickerRoutineOption[] {
  const counts = new Map<string, { workoutTitle: string; sessionCount: number }>();
  for (const session of rows) {
    const prev = counts.get(session.workoutId);
    if (prev) prev.sessionCount += 1;
    else counts.set(session.workoutId, { workoutTitle: session.workoutTitle, sessionCount: 1 });
  }
  return [...counts.entries()]
    .map(([workoutId, meta]) => ({ workoutId, ...meta }))
    .sort((a, b) => a.workoutTitle.localeCompare(b.workoutTitle, "es"));
}

async function loadLinkedPostMap(userId: string): Promise<Map<string, string>> {
  const rows = await query<{ session_id: string; id: string }>(
    `SELECT session_id, id FROM posts WHERE user_id = $1::uuid AND session_id IS NOT NULL`,
    [userId]
  );
  return new Map(rows.map((r) => [r.session_id, r.id]));
}

export async function querySessionsForPicker(
  input: SessionPickerQueryInput
): Promise<SessionPickerQueryResult> {
  const userId = input.userId;
  const q = (input.q ?? "").trim().toLowerCase();
  const workoutId = (input.workoutId ?? "").trim();
  const fromMs = input.from ? Date.parse(input.from) : NaN;
  const toMs = input.to ? Date.parse(input.to) : NaN;
  const includeLinked = input.includeLinked !== false;
  const limit = Math.min(MAX_LIMIT, Math.max(1, input.limit ?? DEFAULT_LIMIT));

  const [dbRows, linkedMap] = await Promise.all([
    query<PickerDbRow>(
      `SELECT s.id, s.user_id, s.workout_id, s.performed_at, s.notes, s.snapshot, s.created_at,
              w.title AS workout_title, w.exercise_blocks, w.exercise_ids
       FROM workout_sessions s
       LEFT JOIN workouts w ON w.id = s.workout_id
       WHERE s.user_id = $1::uuid
       ORDER BY s.performed_at DESC, s.id DESC`,
      [userId]
    ),
    loadLinkedPostMap(userId),
  ]);

  const exerciseNames = await loadExerciseNames(collectExerciseIds(dbRows));

  let rows = dbRows.map((row) => mapPickerRow(row, linkedMap.get(row.id) ?? null, exerciseNames));

  if (workoutId) rows = rows.filter((s) => s.workoutId === workoutId);
  if (Number.isFinite(fromMs)) rows = rows.filter((s) => Date.parse(s.performedAt) >= fromMs);
  if (Number.isFinite(toMs)) rows = rows.filter((s) => Date.parse(s.performedAt) <= toMs);
  if (q) rows = rows.filter((s) => sessionHaystack(s).includes(q));
  if (!includeLinked) rows = rows.filter((s) => !s.linkedPostId);

  rows.sort(compareSessions);

  const routineOptions = input.cursor ? [] : buildRoutineOptions(rows);

  if (input.cursor) {
    rows = rows.filter((s) => isBeforeCursor(s, input.cursor!));
  }

  const page = rows.slice(0, limit);
  const hasMore = rows.length > limit;
  const nextCursor = hasMore && page.length > 0 ? encodeCursor(page[page.length - 1]!) : null;

  return { sessions: page, nextCursor, hasMore, routineOptions };
}
