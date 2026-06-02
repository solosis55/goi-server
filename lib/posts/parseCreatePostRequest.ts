import { createPostSchema } from "@/lib/schemas/postSchema";
import { normalizePostMediaFromRequest } from "@/lib/media/postMedia";
import { validationError } from "@/lib/http/apiError";

export type ParsedCreatePost = {
  content: string;
  format: "standard" | "training";
  visibility: "public" | "followers" | "private";
  sessionId: string | null;
  media?: { type: "image"; url: string }[];
  files: File[];
};

function pickString(form: FormData, key: string): string | null {
  const v = form.get(key);
  if (v == null) return null;
  return String(v).trim();
}

async function parseJsonBody(request: Request): Promise<ParsedCreatePost | Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationError([{ message: "JSON no válido" }]);
  }

  const parsed = createPostSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error.flatten());
  }

  const { content, format, visibility, sessionId } = parsed.data;
  const mediaParsed = normalizePostMediaFromRequest(parsed.data.media);
  if (mediaParsed === null) {
    return validationError([{ message: "Formato de imágenes no válido" }]);
  }

  return {
    content,
    format,
    visibility,
    sessionId: sessionId ?? null,
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

  const content = pickString(form, "content") ?? "";
  const formatRaw = pickString(form, "format") ?? "standard";
  const visibilityRaw = pickString(form, "visibility") ?? "public";
  const sessionRaw = pickString(form, "sessionId");

  const parsed = createPostSchema.safeParse({
    content,
    format: formatRaw,
    visibility: visibilityRaw,
    sessionId: sessionRaw === "" || sessionRaw === "null" ? null : sessionRaw,
  });
  if (!parsed.success) {
    return validationError(parsed.error.flatten());
  }

  const files = form
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (files.length > 4) {
    return validationError([{ message: "Máximo 4 imágenes por publicación" }]);
  }

  return {
    content: parsed.data.content,
    format: parsed.data.format,
    visibility: parsed.data.visibility,
    sessionId: parsed.data.sessionId ?? null,
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
