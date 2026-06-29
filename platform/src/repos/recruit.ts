import { sql } from "drizzle-orm";
import { withSession, type Session } from "@/db/client";

export const STAGES = ["Applied", "Screening", "Interview", "Offer", "Hired"] as const;

export type Req = { id: string; title: string; department: string | null; location: string | null; openings: number; status: string; description: string | null; candidates: number };
export type Cand = { id: string; req_id: string; name: string; req_title: string; stage: string; rating: number | null; source: string | null };

const canManage = (s: Session) => s.role === "owner" || s.role === "hr_admin"; // approves & runs the pipeline
const canCreate = (s: Session) => canManage(s) || s.role === "manager";        // managers can raise reqs

export async function listRecruitment(s: Session): Promise<{ reqs: Req[]; cands: Cand[]; canManage: boolean; canCreate: boolean }> {
  if (s.role === "employee") return { reqs: [], cands: [], canManage: false, canCreate: false };
  return withSession(s, async (tx) => {
    const rq = (await tx.execute(sql`select id, title, department, location, openings, status, description, hiring_manager_id from requisition order by created_at desc`)).rows as Array<Record<string, unknown>>;
    const cd = (await tx.execute(sql`select id, req_id, name, stage, rating, source from candidate`)).rows as Array<Record<string, unknown>>;
    const reqs = s.role === "manager" ? rq.filter((r) => r.hiring_manager_id === s.workerId) : rq;
    const reqIds = new Set(reqs.map((r) => r.id as string));
    const titleById = new Map(reqs.map((r) => [r.id as string, r.title as string]));
    const cands: Cand[] = cd.filter((c) => reqIds.has(c.req_id as string)).map((c) => ({
      id: c.id as string, req_id: c.req_id as string, name: c.name as string,
      req_title: titleById.get(c.req_id as string) ?? "—", stage: c.stage as string,
      rating: (c.rating as number) ?? null, source: (c.source as string) ?? null,
    }));
    const reqsOut: Req[] = reqs.map((r) => ({
      id: r.id as string, title: r.title as string, department: (r.department as string) ?? null,
      location: (r.location as string) ?? null, openings: r.openings as number, status: r.status as string,
      description: (r.description as string) ?? null,
      candidates: cd.filter((c) => c.req_id === r.id && c.stage !== "Rejected").length,
    }));
    return { reqs: reqsOut, cands, canManage: canManage(s), canCreate: canCreate(s) };
  });
}

export async function createRequisition(s: Session, input: { title: string; department: string | null; location: string | null; openings: number; description?: string | null }): Promise<void> {
  if (!canCreate(s)) throw new Error("Not authorized.");
  if (!input.title.trim()) throw new Error("Role title is required.");
  // Managers raise reqs that need HR sign-off; HR/Owner-created reqs open directly.
  const status = canManage(s) ? "Open" : "Pending approval";
  const description = input.description?.trim() || null;
  await withSession(s, async (tx) => {
    await tx.execute(sql`insert into requisition (tenant_id, title, department, location, openings, status, description, hiring_manager_id, opened_on)
      values (${s.tenantId}, ${input.title.trim()}, ${input.department}, ${input.location}, ${input.openings || 1}, ${status}, ${description}, ${s.workerId}, current_date)`);
    await tx.execute(sql`insert into audit_log (tenant_id, actor_id, action, entity, after) values (${s.tenantId}, ${s.userId}, 'create', 'requisition', ${JSON.stringify({ ...input, status })}::jsonb)`);
  });
}

/** HR/Owner approves (→ Open) or rejects (→ Rejected) a manager-raised requisition. */
export async function decideRequisition(s: Session, reqId: string, approve: boolean): Promise<void> {
  if (!canManage(s)) throw new Error("Only HR can approve requisitions.");
  await withSession(s, async (tx) => {
    const res = await tx.execute(sql`update requisition set status = ${approve ? "Open" : "Rejected"} where id = ${reqId} and status = 'Pending approval'`);
    if (res.rowCount === 0) throw new Error("This requisition isn't pending approval.");
    await tx.execute(sql`insert into audit_log (tenant_id, actor_id, action, entity, entity_id, after) values (${s.tenantId}, ${s.userId}, ${approve ? "req_approve" : "req_reject"}, 'requisition', ${reqId}, ${JSON.stringify({ status: approve ? "Open" : "Rejected" })}::jsonb)`);
  });
}

/** Add a candidate to an open requisition (HR/Owner any; manager only their own). */
export async function addCandidate(s: Session, input: { reqId: string; name: string; email: string; source: string }): Promise<void> {
  if (!canCreate(s)) throw new Error("Not authorized.");
  if (!input.name.trim()) throw new Error("Candidate name is required.");
  await withSession(s, async (tx) => {
    const r = (await tx.execute(sql`select status, hiring_manager_id from requisition where id = ${input.reqId} limit 1`)).rows as Array<{ status: string; hiring_manager_id: string | null }>;
    if (!r[0]) throw new Error("Requisition not found.");
    if (!canManage(s) && r[0].hiring_manager_id !== s.workerId) throw new Error("You can only add candidates to your own requisitions.");
    if (r[0].status !== "Open") throw new Error(`This requisition is "${r[0].status}" — only open requisitions accept candidates.`);
    await tx.execute(sql`insert into candidate (tenant_id, req_id, name, email, stage, source, applied_on)
      values (${s.tenantId}, ${input.reqId}, ${input.name.trim()}, ${input.email.trim() || null}, 'Applied', ${input.source.trim() || null}, current_date)`);
    await tx.execute(sql`insert into audit_log (tenant_id, actor_id, action, entity, entity_id, after) values (${s.tenantId}, ${s.userId}, 'add_candidate', 'requisition', ${input.reqId}, ${JSON.stringify({ name: input.name.trim() })}::jsonb)`);
  });
}

export async function moveCandidate(s: Session, id: string, dir: 1 | -1): Promise<void> {
  if (!canManage(s)) throw new Error("Not authorized.");
  await withSession(s, async (tx) => {
    const r = (await tx.execute(sql`select stage from candidate where id = ${id} limit 1`)).rows as Array<{ stage: string }>;
    if (!r[0]) throw new Error("Candidate not found.");
    let i = STAGES.indexOf(r[0].stage as (typeof STAGES)[number]);
    if (i < 0) i = 0;
    i = Math.max(0, Math.min(STAGES.length - 1, i + dir));
    await tx.execute(sql`update candidate set stage = ${STAGES[i]} where id = ${id}`);
  });
}

export async function setCandidateStage(s: Session, id: string, stage: string): Promise<void> {
  if (!canManage(s)) throw new Error("Not authorized.");
  await withSession(s, async (tx) => { await tx.execute(sql`update candidate set stage = ${stage} where id = ${id}`); });
}

/** Hire a candidate → creates a real Core HR employee (worker + dated Hire + comp + audit). */
export async function hireCandidate(s: Session, id: string): Promise<void> {
  if (!canManage(s)) throw new Error("Not authorized.");
  await withSession(s, async (tx) => {
    const rows = (await tx.execute(sql`select c.name, c.email, r.title, r.department, r.location from candidate c join requisition r on r.id = c.req_id where c.id = ${id} limit 1`)).rows as Array<Record<string, string | null>>;
    if (!rows[0]) throw new Error("Candidate not found.");
    const cand = rows[0];
    const resolve = async (table: "department" | "location", name: string | null) => {
      if (!name) return null;
      const f = (await tx.execute(sql`select id from ${sql.raw(table)} where lower(name) = lower(${name}) limit 1`)).rows as Array<{ id: string }>;
      if (f[0]) return f[0].id;
      return ((await tx.execute(sql`insert into ${sql.raw(table)} (tenant_id, name) values (${s.tenantId}, ${name}) returning id`)).rows as Array<{ id: string }>)[0].id;
    };
    const did = await resolve("department", cand.department);
    const lid = await resolve("location", cand.location);
    const today = new Date().toISOString().slice(0, 10);
    const w = (await tx.execute(sql`insert into worker (tenant_id, full_name, email, hired_on) values (${s.tenantId}, ${cand.name}, ${cand.email}, ${today}::date) returning id`)).rows as Array<{ id: string }>;
    const wid = w[0].id;
    await tx.execute(sql`insert into job_event (tenant_id, worker_id, effective_date, seq, event_type, title, department_id, location_id, employment_status, recorded_by)
      values (${s.tenantId}, ${wid}, ${today}::date, 0, 'Hire', ${cand.title ?? "Employee"}, ${did}, ${lid}, 'Active', ${s.userId})`);
    await tx.execute(sql`insert into compensation_event (tenant_id, worker_id, effective_date, seq, amount, currency, recorded_by) values (${s.tenantId}, ${wid}, ${today}::date, 0, 600000, 'INR', ${s.userId})`);
    await tx.execute(sql`update candidate set stage = 'Hired' where id = ${id}`);
    await tx.execute(sql`insert into audit_log (tenant_id, actor_id, action, entity, entity_id, after) values (${s.tenantId}, ${s.userId}, 'hire', 'candidate', ${id}, ${JSON.stringify({ worker_id: wid, name: cand.name })}::jsonb)`);
  });
}
