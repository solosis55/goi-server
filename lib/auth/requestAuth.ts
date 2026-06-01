import { jsonError } from "@/lib/http/apiError";
import { verifyAuthToken } from "@/lib/auth/jwt";

function getBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const [type, token] = authHeader.split(" ");
  if (type !== "Bearer" || !token) return null;
  return token;
}

/** userId del JWT (cabecera o `?access_token=` para imágenes en React Native). */
export function getAuthUserIdFromRequest(request: Request): string | null {
  const headerToken = getBearerToken(request.headers.get("authorization"));
  const token =
    headerToken ?? new URL(request.url).searchParams.get("access_token")?.trim() ?? null;
  if (!token) return null;
  try {
    return verifyAuthToken(token);
  } catch {
    return null;
  }
}

/** Exige Bearer JWT; devuelve userId o Response 401. */
export function requireAuthUserId(request: Request): string | Response {
  const token = getBearerToken(request.headers.get("authorization"));
  if (!token) {
    return jsonError(401, "AUTH_HEADER_INVALID", "missing or invalid authorization header");
  }
  try {
    return verifyAuthToken(token);
  } catch {
    return jsonError(401, "AUTH_TOKEN_INVALID", "invalid or expired token");
  }
}
