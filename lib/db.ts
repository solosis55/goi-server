import { Pool } from "@neondatabase/serverless";

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const url = process.env.DATABASE_URL?.trim();
    if (!url) {
      throw new Error(
        "DATABASE_URL no está definida. Copia .env.example a .env.local y pega la URL de Neon."
      );
    }
    pool = new Pool({ connectionString: url });
  }
  return pool;
}

/** Ejecuta SQL parametrizado contra Neon. Usa `$1`, `$2`, … en la consulta. */
export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const result = await getPool().query(text, params);
  return result.rows as T[];
}

/** Comprueba que la BD responde (p. ej. health check). */
export async function pingDatabase(): Promise<boolean> {
  const rows = await query<{ ok: number }>("SELECT 1 AS ok");
  return rows[0]?.ok === 1;
}
