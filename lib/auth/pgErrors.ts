/** Detecta violación UNIQUE de PostgreSQL (23505). */
export function isPgUniqueViolation(err: unknown, field: "email" | "username"): boolean {
  const e = err as { code?: string; constraint?: string; detail?: string };
  if (e.code !== "23505") return false;
  const hint = `${e.constraint ?? ""} ${e.detail ?? ""}`.toLowerCase();
  return hint.includes(field);
}
