import { z } from "zod";
import { normalizePostMediaFromRequest } from "@/lib/media/postMedia";
import { validationError } from "@/lib/http/apiError";
import { validateCreatePostContent } from "@/lib/posts/validateCreatePostContent";

export type ParsedCreatePost = {
  content: string;
  format: "standard" | "training";
  visibility: "public" | "followers" | "private";
  sessionId: string | null;
  media?: { type: "image"; url: string }[];
  files: File[];
};

const metaSchema = z.object({
  format: z.enum(["standard", "training"]).default("standard"),
  visibility: z.enum(["public", "followers", "private"]).default("public"),
  sessionId: z.string().uuid().nullable().optional(),
});

function pickString(form: FormData, key: string): string | null {
  const v = form.get(key);
  if (v == null) return null;
  return String(v).trim();
}

function parseMeta(raw: {
  format?: unknown;
  visibility?: unknown;
  sessionId?: unknown;
}): z.infer<typeof metaSchema> | Response {
  const parsed = metaSchema.safeParse(raw);
  if (!parsed.success) {
    return validationError(parsed.error.flatten());
  }
  return parsed.data;
}

/** Acepta `File` o `Blob` (React Native FormData). */
export function extractUploadFiles(form: FormData): File[] {
  const out: File[] = [];
  let index = 0;
  for (const entry of form.getAll("files")) {
    if (entry instanceof File && entry.size > 0) {
      out.push(entry);
      continue;
    }
    if (entry instanceof Blob && entry.size > 0) {
      const type = entry.type || "image/jpeg";
      const ext = type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg";
      out.push(new File([entry], `upload-${index}.${ext}`, { type }));
      index += 1;
    }
  }
  return out;
}

async function parseJsonBody(request: Request): Promise<ParsedCreatePost | Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationError([{ message: "JSON no válido" }]);
  }

  if (!body || typeof body !== "object") {
    return validationError([{ message: "JSON no válido" }]);
  }

  const raw = body as Record<string, unknown>;
  const meta = parseMeta({
    format: raw.format,
    visibility: raw.visibility,
    sessionId: raw.sessionId ?? null,
  });
  if (meta instanceof Response) return meta;

  const mediaParsed = normalizePostMediaFromRequest(raw.media);
  if (mediaParsed === null) {
    return validationError([{ message: "Formato de imágenes no válido" }]);
  }

  const attachmentCount = mediaParsed?.length ?? 0;
  const contentRaw = typeof raw.content === "string" ? raw.content : "";
  const contentCheck = validateCreatePostContent(contentRaw, attachmentCount);
  if (!contentCheck.ok) {
    return validationError([{ message: contentCheck.message }]);
  }

  return {
    content: contentCheck.content,
    format: meta.format,
    visibility: meta.visibility,
    sessionId: meta.sessionId ?? null,
    media: mediaParsed,
    files: [],
  };
}

async function parseMultipartBody(request: Request): Promise<ParsedCreatePost | Response> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return validationError([{ message: "multipart no válido" }]);
  }

  const files = extractUploadFiles(form);
  if (files.length > 4) {
    return validationError([{ message: "Máximo 4 imágenes por publicación" }]);
  }

  const contentRaw = pickString(form, "content") ?? "";
  const contentCheck = validateCreatePostContent(contentRaw, files.length);
  if (!contentCheck.ok) {
    return validationError([{ message: contentCheck.message }]);
  }

  const sessionRaw = pickString(form, "sessionId");
  const meta = parseMeta({
    format: pickString(form, "format") ?? "standard",
    visibility: pickString(form, "visibility") ?? "public",
    sessionId: sessionRaw === "" || sessionRaw === "null" ? null : sessionRaw,
  });
  if (meta instanceof Response) return meta;

  return {
    content: contentCheck.content,
    format: meta.format,
    visibility: meta.visibility,
    sessionId: meta.sessionId ?? null,
    files,
  };
}

export async function parseCreatePostRequest(request: Request): Promise<ParsedCreatePost | Response> {
  const ct = request.headers.get("content-type") ?? "";
  if (ct.includes("multipart/form-data")) {
    return parseMultipartBody(request);
  }
  return parseJsonBody(request);
}
