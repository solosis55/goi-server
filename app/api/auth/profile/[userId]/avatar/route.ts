import { NextResponse } from "next/server";
import { requireAuthUserId } from "@/lib/auth/requestAuth";
import { jsonError, serverError } from "@/lib/http/apiError";
import { buildPublicAssetUrl, saveProfileImageUpload } from "@/lib/uploads/profileUpload";

type RouteContext = { params: Promise<{ userId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const auth = requireAuthUserId(request);
  if (auth instanceof Response) return auth;

  const { userId } = await context.params;
  if (auth !== userId) {
    return jsonError(403, "AUTH_FORBIDDEN", "forbidden");
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonError(400, "PROFILE_IMAGE_MISSING", 'expected multipart field "file"');
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return jsonError(400, "PROFILE_IMAGE_MISSING", 'expected multipart field "file"');
  }

  try {
    const { pathname } = await saveProfileImageUpload(userId, "avatars", file);
    return NextResponse.json({ url: buildPublicAssetUrl(request, pathname) });
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "PROFILE_IMAGE_INVALID" || code === "PROFILE_IMAGE_TOO_LARGE") {
      return jsonError(400, code, (err as Error).message);
    }
    return serverError("No se pudo subir la imagen");
  }
}
