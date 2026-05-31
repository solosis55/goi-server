import { NextResponse } from "next/server";
import { pingDatabase } from "@/lib/db";

export async function GET() {
  try {
    const dbOk = await pingDatabase();
    if (!dbOk) {
      return NextResponse.json(
        { ok: false, db: false, message: "La base de datos no respondió como se esperaba." },
        { status: 503 }
      );
    }
    return NextResponse.json({ ok: true, db: true, message: "Conexión a Neon correcta." });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "No se pudo conectar con la base de datos.";
    return NextResponse.json({ ok: false, db: false, message }, { status: 503 });
  }
}
