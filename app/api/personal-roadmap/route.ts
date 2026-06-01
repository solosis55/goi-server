import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http/apiError";
import {
  readPersonalRoadmapFileRaw,
  writePersonalRoadmapFileRaw,
} from "@/lib/personal/personalRoadmapFile";

const BRANCH_LAYOUT_IDS = ["classic", "vertical", "horizontal", "grid"] as const;

function isBranchLayout(x: unknown): x is (typeof BRANCH_LAYOUT_IDS)[number] {
  return typeof x === "string" && (BRANCH_LAYOUT_IDS as readonly string[]).includes(x);
}

type RoadmapTaskNode = {
  id: string;
  title: string;
  done: boolean;
  branchLayout?: (typeof BRANCH_LAYOUT_IDS)[number];
  children: RoadmapTaskNode[];
};

function isRoadmapTaskNode(x: unknown): x is RoadmapTaskNode {
  if (x === null || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  if (
    typeof o.id !== "string" ||
    typeof o.title !== "string" ||
    typeof o.done !== "boolean" ||
    !Array.isArray(o.children) ||
    !o.children.every(isRoadmapTaskNode)
  ) {
    return false;
  }
  if (o.branchLayout !== undefined && !isBranchLayout(o.branchLayout)) return false;
  return true;
}

function sanitizeTasks(input: unknown): RoadmapTaskNode[] | null {
  if (!Array.isArray(input)) return null;
  const out = input.filter(isRoadmapTaskNode);
  return out.length === input.length ? out : null;
}

export async function GET() {
  const raw = readPersonalRoadmapFileRaw();
  if (!raw) {
    return NextResponse.json({ tasks: [] });
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed === null || typeof parsed !== "object") {
      return NextResponse.json({ tasks: [] });
    }
    const tasks = (parsed as { tasks?: unknown }).tasks;
    const loose = Array.isArray(tasks) ? tasks.filter(isRoadmapTaskNode) : [];
    return NextResponse.json({ tasks: loose });
  } catch {
    return jsonError(500, "ROADMAP_CORRUPT", "No se pudo leer el archivo del roadmap.");
  }
}

export async function PUT(request: Request) {
  let body: { tasks?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "ROADMAP_INVALID", "El cuerpo debe ser un JSON { tasks: [...] } con nodos válidos.");
  }

  const sanitized = sanitizeTasks(body.tasks);
  if (sanitized === null) {
    return jsonError(
      400,
      "ROADMAP_INVALID",
      "El cuerpo debe ser un JSON { tasks: [...] } con nodos válidos."
    );
  }

  try {
    writePersonalRoadmapFileRaw(JSON.stringify({ tasks: sanitized }, null, 2));
    return NextResponse.json({ ok: true, tasks: sanitized });
  } catch {
    return jsonError(500, "ROADMAP_WRITE_FAILED", "No se pudo escribir el archivo del roadmap.");
  }
}
