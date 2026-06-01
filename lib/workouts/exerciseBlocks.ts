import {
  ALLOWED_EQUIPMENT_SLUGS,
  ALLOWED_LATERALITY_SLUGS,
  ALLOWED_SET_TYPE_SLUGS,
} from "@/lib/workouts/constants";
import { sanitizeText } from "@/lib/validation/text";
import type { WorkoutExerciseBlock, WorkoutSetRow } from "@/lib/workouts/types";

const MAX_SETS_PER_EXERCISE = 24;
const SET_FIELD_MAX = 24;
const DEFAULT_SET_TYPE = "normal";
const DEFAULT_LATERALITY = "bilateral";

function normalizeSetType(raw: unknown): string {
  const t = sanitizeText(raw);
  if (t && ALLOWED_SET_TYPE_SLUGS.has(t)) return t;
  return DEFAULT_SET_TYPE;
}

function normalizeEquipmentSlug(raw: unknown): string {
  const s = sanitizeText(raw);
  if (s && ALLOWED_EQUIPMENT_SLUGS.has(s)) return s;
  return "";
}

function normalizeLaterality(raw: unknown): "bilateral" | "unilateral" {
  const t = sanitizeText(raw);
  if (t && ALLOWED_LATERALITY_SLUGS.has(t)) {
    return t as "bilateral" | "unilateral";
  }
  return DEFAULT_LATERALITY;
}

function sanitizeSetRow(raw: unknown): WorkoutSetRow {
  if (!raw || typeof raw !== "object") {
    return { reps: "", weight: "", setType: DEFAULT_SET_TYPE };
  }
  const o = raw as Record<string, unknown>;
  return {
    reps: sanitizeText(o.reps).slice(0, SET_FIELD_MAX),
    weight: sanitizeText(o.weight).slice(0, SET_FIELD_MAX),
    setType: normalizeSetType(o.setType),
  };
}

function sanitizeOneBlock(raw: unknown): WorkoutExerciseBlock | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const exerciseId = sanitizeText(o.exerciseId);
  if (!exerciseId) return null;

  const equipmentSlug = normalizeEquipmentSlug(o.equipmentSlug);
  const laterality = normalizeLaterality(o.laterality);
  let sets: WorkoutSetRow[] = [];
  if (Array.isArray(o.sets)) {
    for (const s of o.sets) {
      sets.push(sanitizeSetRow(s));
      if (sets.length >= MAX_SETS_PER_EXERCISE) break;
    }
  }
  if (sets.length === 0) {
    sets = [{ reps: "", weight: "", setType: DEFAULT_SET_TYPE }];
  }

  const block: WorkoutExerciseBlock = { exerciseId, sets, laterality };
  if (equipmentSlug) block.equipmentSlug = equipmentSlug;
  return block;
}

export function sanitizeExerciseBlocksPayload(raw: unknown): WorkoutExerciseBlock[] | null {
  if (!Array.isArray(raw)) return null;
  const out: WorkoutExerciseBlock[] = [];
  for (const item of raw) {
    const b = sanitizeOneBlock(item);
    if (b) out.push(b);
  }
  return out;
}

export function blocksFromExerciseIdsOnly(ids: string[]): WorkoutExerciseBlock[] {
  return ids.map((exerciseId) => ({
    exerciseId,
    laterality: DEFAULT_LATERALITY,
    sets: [{ reps: "", weight: "", setType: DEFAULT_SET_TYPE }],
  }));
}

export function sanitizeExerciseIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const id = item.trim();
    if (id) out.push(id);
  }
  return out;
}
