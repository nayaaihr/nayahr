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
export type PendingChange = { id: string; effective_date: string; title: string; new_status: string };
export type PayrollDetails = { bankAccount: string | null; bankIfsc: string | null; pan: string | null; uan: string | null };
export type WorkerDetail = {
  person: PersonRow;
  jobHistory: JobEvent[];
  comp: CompHistoryRow[];
  leave: LeaveRow[];
  balances: LeaveBalance[];
  review: Review | null;
  goals: PerfGoal[];
  payroll: PayrollDetails; // bank + statutory identifiers (HR-editable)
  canEdit: boolean;     // can open the edit form (HR any; manager their team, not self)
  directEdit: boolean;  // HR/Owner — applies immediately; managers submit for approval
  pending: PendingChange | null;
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

  const [comp, leaveAll, perf, jobHistory, pending, payroll] = await Promise.all([
    listCompHistory(s), listLeave(s), listPerformance(s), getJobHistory(s, workerId), getPendingChange(s, workerId), getPayrollDetails(s, workerId),
  ]);
  const leave = leaveAll.filter((l) => l.worker_id === workerId);
  const isHR = s.role === "owner" || s.role === "hr_admin";
  return {
    person,
    jobHistory,
    comp: comp.get(workerId) ?? [],
    leave,
    balances: balancesFor(leave, workerId),
    review: perf.rows.find((r) => r.worker_id === workerId) ?? null,
    goals: perf.goals.filter((g) => g.worker_id === workerId),
    payroll,
    canEdit: isHR || (s.role === "manager" && workerId !== s.workerId),
    directEdit: isHR,
    pending,
  };
}

async function getPayrollDetails(s: Session, workerId: string): Promise<PayrollDetails> {
  const empty: PayrollDetails = { bankAccount: null, bankIfsc: null, pan: null, uan: null };
  try {
    return await withSession(s, async (tx) => {
      const r = (await tx.execute(sql`select bank_account, bank_ifsc, pan, uan from worker where id = ${workerId} limit 1`)).rows as Array<Record<string, unknown>>;
      const x = r[0] ?? {};
      return {
        bankAccount: (x.bank_account as string) ?? null, bankIfsc: (x.bank_ifsc as string) ?? null,
        pan: (x.pan as string) ?? null, uan: (x.uan as string) ?? null,
      };
    });
  } catch {
    // Columns not migrated yet — the profile page must still render.
    return empty;
  }
}

/** Update a worker's bank + statutory identifiers. HR/Owner only. Light-validates
 *  the formats and audits which fields were set (never logs the raw values). */
export async function updatePayrollDetails(s: Session, workerId: string, f: PayrollDetails): Promise<void> {
  if (!(s.role === "owner" || s.role === "hr_admin")) throw new Error("Only HR can edit payroll details.");
  const norm = (v: string | null) => { const t = (v ?? "").trim(); return t === "" ? null : t; };
  const bankAccount = norm(f.bankAccount);
  const bankIfsc = norm(f.bankIfsc)?.toUpperCase() ?? null;
  const pan = norm(f.pan)?.toUpperCase() ?? null;
  const uan = norm(f.uan);
  if (bankAccount && !/^\d{6,20}$/.test(bankAccount)) throw new Error("Account number should be 6–20 digits.");
  if (bankIfsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bankIfsc)) throw new Error("IFSC looks invalid (e.g. HDFC0001234).");
  if (pan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) throw new Error("PAN looks invalid (e.g. ABCDE1234F).");
  if (uan && !/^\d{12}$/.test(uan)) throw new Error("UAN should be 12 digits.");
  await withSession(s, async (tx) => {
    await tx.execute(sql`update worker set bank_account = ${bankAccount}, bank_ifsc = ${bankIfsc}, pan = ${pan}, uan = ${uan} where id = ${workerId} and tenant_id = ${s.tenantId}`);
    await tx.execute(sql`insert into audit_log (tenant_id, actor_id, action, entity, entity_id, after) values (${s.tenantId}, ${s.userId}, 'payroll_details', 'worker', ${workerId},
      ${JSON.stringify({ bankAccount: bankAccount ? "set" : null, bankIfsc: bankIfsc ? "set" : null, pan: pan ? "set" : null, uan: uan ? "set" : null })}::jsonb)`);
  });
}

async function getPendingChange(s: Session, workerId: string): Promise<PendingChange | null> {
  return withSession(s, async (tx) => {
    const r = (await tx.execute(sql`select id, effective_date, title, new_status from job_change_request
      where worker_id = ${workerId} and req_status = 'Pending' order by created_at desc limit 1`)).rows as Array<Record<string, unknown>>;
    if (!r[0]) return null;
    return { id: r[0].id as string, effective_date: String(r[0].effective_date).slice(0, 10), title: r[0].title as string, new_status: r[0].new_status as string };
  });
}

type JobInput = { effectiveDate: string; title: string; departmentId: string | null; locationId: string | null; managerId: string | null; status: string; email?: string | null };

/** Effective-dated job change. HR/Owner apply it directly (appends a dated
 *  job_event; history preserved). Managers submit it for HR approval instead. */
export async function changeJob(s: Session, workerId: string, input: JobInput): Promise<{ pending: boolean; emailChanged: boolean }> {
  const isHR = s.role === "owner" || s.role === "hr_admin";
  const isManager = s.role === "manager";
  if (!isHR && !isManager) throw new Error("Not authorized.");
  if (!input.title.trim()) throw new Error("Job title is required.");
  if (!input.effectiveDate) throw new Error("Pick an effective date.");
  if (input.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.email.trim())) throw new Error("Enter a valid email address.");
  if (isManager) {
    if (workerId === s.workerId) throw new Error("You can't change your own job details.");
    const team = new Set((await listPeople(s)).map((p) => p.worker_id));
    if (!team.has(workerId)) throw new Error("That employee isn't on your team.");
  }
  const eff = input.effectiveDate;
  let emailChanged = false;
  await withSession(s, async (tx) => {
    const w = (await tx.execute(sql`select email from worker where id = ${workerId} limit 1`)).rows as Array<{ email: string | null }>;
    if (!w[0]) throw new Error("Employee not found.");
    // Email is contact info (not effective-dated) — applied immediately + audited.
    const finalEmail = input.email !== undefined ? (input.email?.trim() || null) : w[0].email;
    if (input.email !== undefined && finalEmail !== w[0].email) {
      await tx.execute(sql`update worker set email = ${finalEmail} where id = ${workerId}`);
      await tx.execute(sql`insert into audit_log (tenant_id, actor_id, action, entity, entity_id, after) values (${s.tenantId}, ${s.userId}, 'email_change', 'worker', ${workerId}, ${JSON.stringify({ email: finalEmail })}::jsonb)`);
      emailChanged = true;
    }
    // Always keep the login/invite email (app_user) in sync with the worker's
    // email — this also heals any earlier drift — unless another account in this
    // tenant already uses that address.
    if (finalEmail) {
      await tx.execute(sql`
        update app_user set email = ${finalEmail}
        where worker_id = ${workerId} and tenant_id = ${s.tenantId} and lower(email) <> lower(${finalEmail})
          and not exists (select 1 from app_user b where b.tenant_id = ${s.tenantId}
                          and lower(b.email) = lower(${finalEmail}) and b.worker_id is distinct from ${workerId})`);
    }
    if (isHR) {
      const seq = (await tx.execute(sql`select coalesce(max(seq), -1) + 1 as next from job_event where worker_id = ${workerId} and effective_date = ${eff}::date`)).rows as Array<{ next: number }>;
      await tx.execute(sql`insert into job_event (tenant_id, worker_id, effective_date, seq, event_type, title, department_id, location_id, manager_id, employment_status, recorded_by)
        values (${s.tenantId}, ${workerId}, ${eff}::date, ${seq[0].next}, 'Change', ${input.title.trim()}, ${input.departmentId}, ${input.locationId}, ${input.managerId}, ${input.status}, ${s.userId})`);
      await tx.execute(sql`insert into audit_log (tenant_id, actor_id, action, entity, entity_id, after) values (${s.tenantId}, ${s.userId}, 'job_change', 'worker', ${workerId}, ${JSON.stringify({ effective_date: eff, title: input.title.trim(), status: input.status })}::jsonb)`);
    } else {
      await tx.execute(sql`insert into job_change_request (tenant_id, worker_id, effective_date, title, department_id, location_id, manager_id, new_status, req_status, requested_by)
        values (${s.tenantId}, ${workerId}, ${eff}::date, ${input.title.trim()}, ${input.departmentId}, ${input.locationId}, ${input.managerId}, ${input.status}, 'Pending', ${s.userId})`);
      await tx.execute(sql`insert into audit_log (tenant_id, actor_id, action, entity, entity_id, after) values (${s.tenantId}, ${s.userId}, 'job_change_request', 'worker', ${workerId}, ${JSON.stringify({ effective_date: eff, title: input.title.trim() })}::jsonb)`);
    }
  });
  return { pending: isManager, emailChanged };
}

/** HR/Owner approves a manager's job-change request → writes the dated job_event; or rejects. */
export async function decideJobChange(s: Session, reqId: string, approve: boolean): Promise<void> {
  if (!(s.role === "owner" || s.role === "hr_admin")) throw new Error("Only HR can approve job changes.");
  await withSession(s, async (tx) => {
    const r = (await tx.execute(sql`select worker_id, effective_date, title, department_id, location_id, manager_id, new_status
      from job_change_request where id = ${reqId} and req_status = 'Pending' limit 1`)).rows as Array<Record<string, unknown>>;
    if (!r[0]) throw new Error("This request isn't pending.");
    const c = r[0];
    if (approve) {
      const eff = String(c.effective_date).slice(0, 10);
      const seq = (await tx.execute(sql`select coalesce(max(seq), -1) + 1 as next from job_event where worker_id = ${c.worker_id as string} and effective_date = ${eff}::date`)).rows as Array<{ next: number }>;
      await tx.execute(sql`insert into job_event (tenant_id, worker_id, effective_date, seq, event_type, title, department_id, location_id, manager_id, employment_status, recorded_by)
        values (${s.tenantId}, ${c.worker_id as string}, ${eff}::date, ${seq[0].next}, 'Change', ${c.title as string}, ${(c.department_id as string) ?? null}, ${(c.location_id as string) ?? null}, ${(c.manager_id as string) ?? null}, ${c.new_status as string}, ${s.userId})`);
    }
    await tx.execute(sql`update job_change_request set req_status = ${approve ? "Approved" : "Rejected"}, decided_by = ${s.userId}, decided_at = now() where id = ${reqId}`);
    await tx.execute(sql`insert into audit_log (tenant_id, actor_id, action, entity, entity_id, after) values (${s.tenantId}, ${s.userId}, ${approve ? "job_change_approve" : "job_change_reject"}, 'job_change_request', ${reqId}, ${JSON.stringify({ approved: approve })}::jsonb)`);
  });
}

/** Pending job-change requests (for the HR inbox), with employee names. */
export async function listPendingJobChanges(s: Session): Promise<Array<{ id: string; worker_id: string; employee: string; title: string; effective_date: string }>> {
  if (!(s.role === "owner" || s.role === "hr_admin")) return [];
  const nameById = new Map((await listPeople(s)).map((p) => [p.worker_id, p.full_name]));
  return withSession(s, async (tx) => {
    const r = (await tx.execute(sql`select id, worker_id, title, effective_date from job_change_request where req_status = 'Pending' order by created_at desc`)).rows as Array<Record<string, unknown>>;
    return r.map((x) => ({ id: x.id as string, worker_id: x.worker_id as string, employee: nameById.get(x.worker_id as string) ?? "—", title: x.title as string, effective_date: String(x.effective_date).slice(0, 10) }));
  });
}
