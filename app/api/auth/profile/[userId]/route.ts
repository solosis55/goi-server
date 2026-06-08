import { NextResponse } from "next/server";
import { requireAuthUserId } from "@/lib/auth/requestAuth";
import { jsonError, serverError, validationError } from "@/lib/http/apiError";
import { updateProfileSchema } from "@/lib/schemas/profileSchema";
import { getProfileForViewer, updateProfileForUser } from "@/lib/social/profileService";

type RouteContext = { params: Promise<{ userId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const auth = requireAuthUserId(request);
  if (auth instanceof Response) return auth;

  const { userId } = await context.params;
  try {
    const result = await getProfileForViewer(auth, userId);
    if (!result) {
      return jsonError(404, "AUTH_USER_NOT_FOUND", "user not found");
    }
    return NextResponse.json(result);
  } catch {
    return serverError("No se pudo obtener el perfil");
  }
}

export async function PUT(request: Request, context: RouteContext) {
  const auth = requireAuthUserId(request);
  if (auth instanceof Response) return auth;

  const { userId } = await context.params;
  if (auth !== userId) {
    return jsonError(403, "AUTH_FORBIDDEN", "forbidden");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationError([{ message: "JSON no válido" }]);
  }

  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error.flatten());
  }

  const data = parsed.data;
  try {
    const result = await updateProfileForUser(userId, {
      username: data.username,
      bio: data.bio,
      goal: data.goal,
      avatarUrl: data.avatarUrl,
      bannerUrl: data.bannerUrl,
      bannerShowInFeed: data.bannerShowInFeed,
      websiteUrl: data.websiteUrl,
      instagramUrl: data.instagramUrl,
      stravaUrl: data.stravaUrl,
      location: data.location,
      latitude: data.latitude,
      longitude: data.longitude,
      profileVisibility: data.profileVisibility,
      pinnedPostId: data.pinnedPostId,
    });
    if (!result) {
      return jsonError(404, "AUTH_USER_NOT_FOUND", "user not found");
    }
    return NextResponse.json(result);
  } catch {
    return serverError("No se pudo actualizar el perfil");
  }
}
