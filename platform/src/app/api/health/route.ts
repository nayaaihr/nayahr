import { NextResponse } from "next/server";
import { pool } from "@/db/client";

// Uptime probe for an external monitor (UptimeRobot / BetterStack). Unauthenticated
// and cheap: pings the DB. 200 = healthy, 503 = degraded. Leaks no internals.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const started = Date.now();
  try {
    await pool.query("select 1");
    return NextResponse.json({ status: "ok", db: "up", ms: Date.now() - started });
  } catch {
    return NextResponse.json({ status: "error", db: "down" }, { status: 503 });
  }
}
