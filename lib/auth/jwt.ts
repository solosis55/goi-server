import jwt from "jsonwebtoken";

const DEFAULT_JWT_SECRET = "dev-jwt-secret-change-in-production";

type AuthTokenPayload = {
  sub: string;
};

export function getJwtSecret(): string {
  const fromEnv = process.env.JWT_SECRET?.trim();
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET is required in production");
  }
  return DEFAULT_JWT_SECRET;
}

export function signAuthToken(userId: string) {
  return jwt.sign({ sub: userId } satisfies AuthTokenPayload, getJwtSecret(), { expiresIn: "7d" });
}

export function verifyAuthToken(token: string): string {
  const payload = jwt.verify(token, getJwtSecret()) as AuthTokenPayload;
  return payload.sub;
}
