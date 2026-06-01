import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { getPersonalRoadmapPath } from "@/lib/data/paths";

export function readPersonalRoadmapFileRaw(): string | null {
  const p = getPersonalRoadmapPath();
  if (!existsSync(p)) return null;
  try {
    return readFileSync(p, "utf8");
  } catch {
    return null;
  }
}

export function writePersonalRoadmapFileRaw(jsonBody: string): void {
  const p = getPersonalRoadmapPath();
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, jsonBody, "utf8");
}
