import { NextResponse } from "next/server";

/** Notificaciones aún no implementadas — stub vacío. */
export async function GET() {
  return NextResponse.json({ notifications: [], unreadCount: 0 });
}
