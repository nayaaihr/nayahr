import { sql } from "drizzle-orm";
import { withSession, type Session } from "@/db/client";

export type RefItem = { id: string; name: string };

/** Departments + locations for the tenant (form dropdowns). RLS-scoped. */
export async function listRefData(s: Session): Promise<{ departments: RefItem[]; locations: RefItem[] }> {
  return withSession(s, async (tx) => {
    const d = await tx.execute(sql`select id, name from department order by name`);
    const l = await tx.execute(sql`select id, name from location order by name`);
    return {
      departments: d.rows as unknown as RefItem[],
      locations: l.rows as unknown as RefItem[],
    };
  });
}

export type PersonRow = {
  worker_id: string;
  full_name: string;
  email: string | null;
  hired_on: string;
  title: string;
  employment_status: string;
  department: string | null;
  location: string | null;
  manager_id: string | null;
  manager_name: string | null;
  photo_url: string | null;
  salary: string | null; // numeric comes back as string from pg
};

/**
 * Current Core HR snapshot "as of" a date — the effective-dated read.
 * For each worker we pick the latest job_event with effective_date <= asOf
 * (future-dated rows excluded), plus their current compensation.
 *
 * RBAC scope:
 *   - hr_admin / owner -> whole tenant (org)
 *   - manager          -> their direct reports (team)
 *   - employee         -> just themselves (self)
 * Tenant isolation itself is enforced by RLS (app.tenant), not this query.
 */
export async function listPeople(
  s: Session,
  asOf: string = new Date().toISOString().slice(0, 10),
): Promise<PersonRow[]> {
  const scope = s.role === "employee" ? "self" : s.role === "manager" ? "team" : "org";
  const me = s.workerId; // null for org scope

  return withSession(s, async (tx) => {
    const res = await tx.execute(sql`
      with current_job as (
        select distinct on (w.id)
          w.id as worker_id, w.full_name, w.email, w.hired_on, w.photo_url,
          j.title, j.employment_status, j.department_id, j.location_id, j.manager_id
        from worker w
        join job_event j
          on j.worker_id = w.id and j.effective_date <= ${asOf}::date
        order by w.id, j.effective_date desc, j.seq desc
      )
      select
        cj.worker_id, cj.full_name, cj.email, cj.hired_on, cj.title,
        cj.employment_status, cj.manager_id, cj.photo_url,
        d.name as department, l.name as location, mgr.full_name as manager_name,
        (select ce.amount from compensation_event ce
          where ce.worker_id = cj.worker_id and ce.effective_date <= ${asOf}::date
          order by ce.effective_date desc, ce.seq desc limit 1) as salary
      from current_job cj
      left join department d on d.id = cj.department_id
      left join location  l on l.id = cj.location_id
      left join worker    mgr on mgr.id = cj.manager_id
      where ${scope} = 'org'
         or (${scope} = 'team' and cj.manager_id = ${me}::uuid)
         or (${scope} = 'self' and cj.worker_id = ${me}::uuid)
      order by cj.full_name
    `);
    return res.rows as unknown as PersonRow[];
  });
}
