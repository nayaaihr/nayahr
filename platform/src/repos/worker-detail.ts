import { sql } from "drizzle-orm";
import { withSession, type Session } from "@/db/client";
import { listPeople, type PersonRow } from "@/repos/people";
import { listCompHistory, type CompHistoryRow } from "@/repos/comp";
import { listLeave, balancesFor, type LeaveRow, type LeaveBalance } from "@/repos/leave";
import { listPerformance, type Review, type PerfGoal } from "@/repos/perf";

export type JobEvent = {
  effective_date: string; event_type: string; title: string; status: string;
  department: string | null; location: string | null; manager: string | null;
};
export type WorkerDetail = {
  person: PersonRow;
  jobHistory: JobEvent[];
  comp: CompHistoryRow[];
  leave: LeaveRow[];
  balances: LeaveBalance[];
  review: Review | null;
  goals: PerfGoal[];
  canEdit: boolean;
};

async function getJobHistory(s: Session, workerId: string): Promise<JobEvent[]> {
  return withSession(s, async (tx) => {
    const r = (await tx.execute(sql`
      select je.effective_date, je.event_type, je.title, je.employment_status,
             d.name as department, l.name as location, m.full_name as manager
      from job_event je
      left join department d on d.id = je.department_id
      left join location  l on l.id = je.location_id
      left join worker    m on m.id = je.manager_id
      where je.worker_id = ${workerId}
      order by je.effective_date desc, je.seq desc`)).rows as Array<Record<string, unknown>>;
    return r.map((x) => ({
      effective_date: String(x.effective_date).slice(0, 10),
      event_type: (x.event_type as string) ?? "Change",
      title: (x.title as string) ?? "—",
      status: (x.employment_status as string) ?? "Active",
      department: (x.department as string) ?? null,
      location: (x.location as string) ?? null,
      manager: (x.manager as string) ?? null,
    }));
  });
}

/** Full profile for one worker, aggregated across modules. Returns null if the
 *  worker isn't visible to the viewer (role scope / wrong tenant). */
export async function getWorkerDetail(s: Session, workerId: string): Promise<WorkerDetail | null> {
  const people = await listPeople(s);
  const person = people.find((p) => p.worker_id === workerId);
  if (!person) return null;

  const [comp, leaveAll, perf, jobHistory] = await Promise.all([
    listCompHistory(s), listLeave(s), listPerformance(s), getJobHistory(s, workerId),
  ]);
  const leave = leaveAll.filter((l) => l.worker_id === workerId);
  return {
    person,
    jobHistory,
    comp: comp.get(workerId) ?? [],
    leave,
    balances: balancesFor(leave, workerId),
    review: perf.rows.find((r) => r.worker_id === workerId) ?? null,
    goals: perf.goals.filter((g) => g.worker_id === workerId),
    canEdit: s.role === "owner" || s.role === "hr_admin",
  };
}

/** Effective-dated job change → appends a new job_event (Owner/HR only for now).
 *  History is preserved because job_event is append-only. */
export async function changeJob(
  s: Session,
  workerId: string,
  input: { effectiveDate: string; title: string; departmentId: string | null; locationId: string | null; managerId: string | null; status: string },
): Promise<void> {
  if (!(s.role === "owner" || s.role === "hr_admin")) throw new Error("Only HR/Owner can edit directly. Manager changes route through HR approval (coming soon).");
  if (!input.title.trim()) throw new Error("Job title is required.");
  if (!input.effectiveDate) throw new Error("Pick an effective date.");
  await withSession(s, async (tx) => {
    const w = (await tx.execute(sql`select 1 from worker where id = ${workerId} limit 1`)).rows;
    if (!w[0]) throw new Error("Employee not found.");
    const eff = input.effectiveDate;
    const seq = (await tx.execute(sql`select coalesce(max(seq), -1) + 1 as next from job_event where worker_id = ${workerId} and effective_date = ${eff}::date`)).rows as Array<{ next: number }>;
    await tx.execute(sql`insert into job_event (tenant_id, worker_id, effective_date, seq, event_type, title, department_id, location_id, manager_id, employment_status, recorded_by)
      values (${s.tenantId}, ${workerId}, ${eff}::date, ${seq[0].next}, 'Change', ${input.title.trim()}, ${input.departmentId}, ${input.locationId}, ${input.managerId}, ${input.status}, ${s.userId})`);
    await tx.execute(sql`insert into audit_log (tenant_id, actor_id, action, entity, entity_id, after) values (${s.tenantId}, ${s.userId}, 'job_change', 'worker', ${workerId}, ${JSON.stringify({ effective_date: eff, title: input.title.trim(), status: input.status })}::jsonb)`);
  });
}
