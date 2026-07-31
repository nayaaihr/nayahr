import { sql } from "drizzle-orm";
import { db } from "@/db/client";

export type PublicJob = {
  title: string; department: string | null; location: string | null;
  description: string | null; openings: number; company: string; logoUrl: string | null;
  postedAt: string | null; // opened_on (YYYY-MM-DD) — datePosted for JobPosting schema
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Public (unauthenticated) view of a single OPEN requisition. Runs with NO
 *  app.tenant set, so the `public_open_req` / `public_company` RLS policies apply
 *  — only OPEN requisitions are ever visible, nothing else leaks. */
export async function getPublicJob(id: string): Promise<PublicJob | null> {
  if (!UUID_RE.test(id)) return null;
  const r = (await db.execute(sql`
    select r.title, r.department, r.location, r.description, r.openings, r.opened_on, t.name as company, t.logo_url
    from requisition r
    join tenant t on t.id = r.tenant_id
    where r.id = ${id}`)).rows as Array<Record<string, unknown>>;
  if (!r[0]) return null;
  return {
    title: r[0].title as string,
    department: (r[0].department as string) ?? null,
    location: (r[0].location as string) ?? null,
    description: (r[0].description as string) ?? null,
    openings: (r[0].openings as number) ?? 1,
    company: r[0].company as string,
    logoUrl: (r[0].logo_url as string) ?? null,
    postedAt: r[0].opened_on ? String(r[0].opened_on).slice(0, 10) : null,
  };
}
