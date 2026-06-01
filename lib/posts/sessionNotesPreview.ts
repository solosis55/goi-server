/** Parseo de notes de sesiones antiguas (sin snapshot JSON). */

export function parseSeriesFromNotes(notes: string): { completed: number; total: number } | null {
  const first = notes.trim().split("\n")[0]?.trim() ?? "";
  const m = first.match(/^(\d+)\/(\d+)\s+series completadas$/i);
  if (!m) return null;
  const completed = Number(m[1]);
  const total = Number(m[2]);
  if (!Number.isFinite(completed) || !Number.isFinite(total) || total <= 0) return null;
  return { completed, total };
}

export function parseSessionNotesBody(notes: string): string {
  const trimmed = notes.trim();
  if (!trimmed) return "";
  const lines = trimmed.split("\n");
  const first = lines[0]?.trim() ?? "";
  const setsMatch = /^(\d+\/\d+)\s+series completadas$/i.test(first);
  const bodyStart = setsMatch ? 1 : 0;
  let body = lines.slice(bodyStart).join("\n").trim();
  if (body.startsWith("--- Por ejercicio ---")) {
    body = body.replace(/^--- Por ejercicio ---\n?/, "").trim();
  }
  return body;
}

export type SessionExercisePreviewDto = {
  exerciseName: string;
  summary: string;
};

export function parseExercisePreviewsFromNotes(
  notes: string | null | undefined,
  maxExercises = 3
): SessionExercisePreviewDto[] {
  const body = parseSessionNotesBody(notes ?? "");
  if (!body) return [];
  const lines = body
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.slice(0, maxExercises).map((line) => {
    const colon = line.indexOf(":");
    if (colon > 0) {
      return {
        exerciseName: line.slice(0, colon).trim(),
        summary: line.slice(colon + 1).trim() || "—",
      };
    }
    return { exerciseName: line, summary: "" };
  });
}
