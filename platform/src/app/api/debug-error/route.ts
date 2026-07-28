import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

// TEMPORARY — one-time Sentry smoke test. Delete this file (and remove
// /api/debug-error from the middleware public list) once you've confirmed the
// event lands in Sentry. Only fires with ?fire=1 so crawlers can't spam it.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("fire") !== "1") {
    return NextResponse.json({ hint: "append ?fire=1 to send a test error to Sentry" });
  }
  const err = new Error("NayaHR Sentry smoke test — " + new Date().toISOString());
  const eventId = Sentry.captureException(err);
  await Sentry.flush(2000); // ensure it's sent before the function suspends
  return NextResponse.json(
    { status: "error-sent", eventId, dsnConfigured: !!(process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN) },
    { status: 500 },
  );
}
