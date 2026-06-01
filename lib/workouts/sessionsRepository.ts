import { query } from "@/lib/db";
import {
  mapSessionDetail,
  mapSessionRow,
  mapSessionWithTitle,
  type SessionRow,
} from "@/lib/workouts/mappers";
import type { WorkoutSession, WorkoutSessionDetail, WorkoutSessionWithTitle } from "@/lib/workouts/types";
import { findWorkoutById } from "@/lib/workouts/workoutsRepository";
import { isLengthBetween, sanitizeText } from "@/lib/validation/text";

const SESSION_COLS = `s.id, s.user_id, s.workout_id, s.performed_at, s.notes, s.snapshot, s.created_at`;

const NOTES_MAX = 500;

function resolvePerformedAt(raw: unknown): string | null {
  if (raw === undefined || raw === null || raw === "") {
    return new Date().toISOString();
  }
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return new Date().toISOString();
  const ms = Date.parse(trimmed);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toISOString();
}

function normalizeSnapshot(raw: unknown): unknown | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw === "object") return raw;
  return undefined;
}

export async function listSessionsForUser(userId: string): Promise<WorkoutSessionWithTitle[]> {
  const rows = await query<SessionRow>(
    `SELECT ${SESSION_COLS}, w.title AS workout_title
     FROM workout_sessions s
     LEFT JOIN workouts w ON w.id = s.workout_id
     WHERE s.user_id = $1
     ORDER BY s.performed_at DESC`,
    [userId]
  );
  return rows.map((r) => mapSessionWithTitle(r));
}

/** Perfil público: sin snapshot JSONB, con límite en SQL. */
export async function listSessionsForProfileOverview(
  userId: string,
  limit = 40
): Promise<WorkoutSessionWithTitle[]> {
  const cap = Math.min(Math.max(limit, 1), 80);
  const rows = await query<SessionRow>(
    `SELECT s.id, s.user_id, s.workout_id, s.performed_at, s.notes, s.created_at,
            w.title AS workout_title
     FROM workout_sessions s
     LEFT JOIN workouts w ON w.id = s.workout_id
     WHERE s.user_id = $1::uuid
     ORDER BY s.performed_at DESC
     LIMIT $2`,
    [userId, cap]
  );
  return rows.map((r) => mapSessionWithTitle(r));
}

export async function getSessionById(id: string): Promise<WorkoutSessionDetail | null> {
  const rows = await query<SessionRow>(
    `SELECT ${SESSION_COLS}, w.title AS workout_title, u.username AS author_username, u.avatar_url AS author_avatar_url
     FROM workout_sessions s
     LEFT JOIN workouts w ON w.id = s.workout_id
     LEFT JOIN users u ON u.id = s.user_id
     WHERE s.id = $1`,
    [id]
  );
  const row = rows[0];
  return row ? mapSessionDetail(row) : null;
}

export async function canViewSession(session: WorkoutSession, viewerId: string): Promise<boolean> {
  return session.userId === viewerId;
}

export async function createSession(
  userId: string,
  body: { workoutId?: string; performedAt?: string; notes?: string; snapshot?: unknown }
): Promise<WorkoutSession | "invalid" | "workout_not_found" | "forbidden"> {
  const workoutId = sanitizeText(body.workoutId);
  if (!workoutId) return "invalid";

  const workout = await findWorkoutById(workoutId);
  if (!workout) return "workout_not_found";
  if (workout.userId !== userId) return "forbidden";

  const performedAt = resolvePerformedAt(body.performedAt);
  if (!performedAt) return "invalid";

  const notes = sanitizeText(body.notes);
  if (!isLengthBetween(notes, 0, NOTES_MAX)) return "invalid";

  const snapshot = normalizeSnapshot(body.snapshot);
  const id = crypto.randomUUID();

  const rows = await query<SessionRow>(
    `INSERT INTO workout_sessions (id, user_id, workout_id, performed_at, notes, snapshot)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)
     RETURNING id, user_id, workout_id, performed_at, notes, snapshot, created_at`,
    [id, userId, workoutId, performedAt, notes, snapshot != null ? JSON.stringify(snapshot) : null]
  );
  const row = rows[0];
  return row ? mapSessionRow(row) : "invalid";
}

export async function deleteSession(
  id: string,
  userId: string
): Promise<WorkoutSession | "not_found" | "forbidden"> {
  const rows = await query<SessionRow>(
    `SELECT id, user_id, workout_id, performed_at, notes, snapshot, created_at
     FROM workout_sessions WHERE id = $1`,
    [id]
  );
  const row = rows[0];
  if (!row) return "not_found";
  const session = mapSessionRow(row);
  if (session.userId !== userId) return "forbidden";
  await query(`DELETE FROM workout_sessions WHERE id = $1`, [id]);
  return session;
}
