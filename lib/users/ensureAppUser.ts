import { query } from "@/lib/db";

export type EnsureAppUserInput = {
  id: string;
  username: string;
  avatarUrl?: string;
};

/** Crea o actualiza un usuario de la app móvil/web en Neon (sin auth JWT aún). */
export async function ensureAppUser(input: EnsureAppUserInput): Promise<void> {
  const email = `${input.id}@app.goi.local`;
  await query(
    `INSERT INTO users (id, username, email, password_hash, avatar_url)
     VALUES ($1, $2, $3, 'app-sync', $4)
     ON CONFLICT (id) DO UPDATE SET
       username = EXCLUDED.username,
       avatar_url = EXCLUDED.avatar_url,
       updated_at = NOW()`,
    [input.id, input.username.slice(0, 32), email, input.avatarUrl?.slice(0, 2000) ?? ""]
  );
}
