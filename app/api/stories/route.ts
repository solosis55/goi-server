import { NextResponse } from "next/server";
import { requireAuthUserId } from "@/lib/auth/requestAuth";
import { parseStorySlidesFromRequest } from "@/lib/media/storySlides";
import { jsonError, serverError } from "@/lib/http/apiError";
import { createStoryForUser, listStoriesFeed } from "@/lib/stories/storiesService";
import { findUserById } from "@/lib/users/repository";

export const maxDuration = 60;

export async function GET(request: Request) {
  const auth = requireAuthUserId(request);
  if (auth instanceof Response) return auth;

  try {
    const payload = await listStoriesFeed(auth);
    return NextResponse.json(payload);
  } catch {
    return serverError("No se pudieron cargar las historias");
  }
}

export async function POST(request: Request) {
  const auth = requireAuthUserId(request);
  if (auth instanceof Response) return auth;

  let body: { slides?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "STORY_INVALID_SLIDES", "invalid slides (1–15 images, jpeg/png/webp)");
  }

  const parsed = parseStorySlidesFromRequest(body.slides);
  if (!parsed) {
    return jsonError(400, "STORY_INVALID_SLIDES", "invalid slides (1–15 images, jpeg/png/webp)");
  }

  const user = await findUserById(auth);
  if (!user) {
    return jsonError(401, "AUTH_SESSION_STALE", "jwt user id missing from store");
  }

  try {
    const created = await createStoryForUser(auth, parsed);
    return NextResponse.json(created, { status: 201 });
  } catch {
    return serverError("No se pudo crear la historia");
  }
}
