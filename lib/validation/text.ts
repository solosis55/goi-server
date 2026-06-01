export function sanitizeText(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

export function isLengthBetween(value: string, min: number, max: number): boolean {
  const len = value.length;
  return len >= min && len <= max;
}

export function sanitizeWorkoutTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    const t = sanitizeText(item).toLowerCase().slice(0, 32);
    if (t && !out.includes(t)) out.push(t);
  }
  return out.slice(0, 12);
}
