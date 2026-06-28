import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { listPeople } from "@/repos/people";

export const dynamic = "force-dynamic";

// Read API — the same effective-dated, RLS-scoped query the UI uses.
// This is the seam the server-side AI tools (NH-028) will call too.
export async function GET() {
  try {
    const session = await getSession();
    const people = await listPeople(session);
    return NextResponse.json({
      as_of: new Date().toISOString().slice(0, 10),
      role: session.role,
      count: people.length,
      people,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
