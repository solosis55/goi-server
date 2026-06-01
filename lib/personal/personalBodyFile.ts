import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getPersonalBodyDir } from "@/lib/data/paths";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isSafePersonalBodyUserId(id: string): boolean {
  return UUID_RE.test(id);
}

function pathFor(userId: string): string | null {
  if (!isSafePersonalBodyUserId(userId)) return null;
  return join(getPersonalBodyDir(), `${userId}.json`);
}

export function readPersonalBodyEnvelopeRaw(userId: string): string | null {
  const p = pathFor(userId);
  if (!p || !existsSync(p)) return null;
  try {
    return readFileSync(p, "utf8");
  } catch {
    return null;
  }
}

export function writePersonalBodyEnvelopeRaw(userId: string, jsonBody: string): void {
  const p = pathFor(userId);
  if (!p) throw new Error("invalid user id");
  mkdirSync(getPersonalBodyDir(), { recursive: true });
  writeFileSync(p, jsonBody, "utf8");
}
