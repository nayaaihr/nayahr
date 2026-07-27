import { sql } from "drizzle-orm";
import { withSession, type Session } from "@/db/client";
import { listPeople } from "./people";
import { listLeave } from "./leave";
import { computePay, daysInPeriod } from "@/lib/payroll";

const isHR = (s: Session) => s.role === "owner" || s.role === "hr_admin";
const num = (v: unknown) => Number(v ?? 0);

export type RunRow = {
  id: string; period: string; status: string;
  headcount: number; gross: number; deductions: number; net: number; cost: number;
  created_at: string; finalized_at: string | null;
};
export type PayslipRow = {
  id: string; worker_id: string; name: string;
  basic: number; hra: number; conveyance: number; special: number; gross: number;
  lop_days: number; lop: number; pf_employee: number; esi_employee: number; pt: number; tds: number;
  employer_pf: number; employer_esi: number; total_deductions: number; net: number;
};

function toSlip(x: Record<string, unknown>): PayslipRow {
  return {
    id: x.id as string, worker_id: x.worker_id as string, name: x.name as string,
    basic: num(x.basic), hra: num(x.hra), conveyance: num(x.conveyance), special: num(x.special), gross: num(x.gross),
    lop_days: num(x.lop_days), lop: num(x.lop), pf_employee: num(x.pf_employee), esi_employee: num(x.esi_employee),
    pt: num(x.pt), tds: num(x.tds), employer_pf: num(x.employer_pf), employer_esi: num(x.employer_esi),
    total_deductions: num(x.total_deductions), net: num(x.net),
  };
}

/** All payroll runs with roll-up totals. HR/Owner only. */
export async function listRuns(s: Session): Promise<RunRow[]> {
  if (!isHR(s)) return [];
  return withSession(s, async (tx) => {
    const r = (await tx.execute(sql`
      select r.id, to_char(r.period,'YYYY-MM') as period, r.status, r.created_at, r.finalized_at,
        count(p.id)::int as headcount,
        coalesce(sum(p.gross),0) as gross,
        coalesce(sum(p.total_deductions),0) as deductions,
        coalesce(sum(p.net),0) as net,
        coalesce(sum(p.gross + p.employer_pf + p.employer_esi),0) as cost
      from payroll_run r left join payslip p on p.run_id = r.id
      group by r.id order by r.period desc
    `)).rows as Array<Record<string, unknown>>;
    return r.map((x) => ({
      id: x.id as string, period: x.period as string, status: x.status as string,
      headcount: num(x.headcount), gross: num(x.gross), deductions: num(x.deductions), net: num(x.net), cost: num(x.cost),
      created_at: String(x.created_at), finalized_at: x.finalized_at ? String(x.finalized_at) : null,
    }));
  });
}

/** Create a draft run for a "YYYY-MM" month: snapshot a payslip for every active,
 *  salaried employee, prorating LOP from approved "Loss of Pay" leave that month. */
export async function createRun(s: Session, period: string): Promise<string> {
  if (!isHR(s)) throw new Error("Only HR can run payroll.");
  if (!/^\d{4}-\d{2}$/.test(period)) throw new Error("Pick a valid month.");
  const first = `${period}-01`;
  const dim = daysInPeriod(period);

  const active = (await listPeople(s)).filter((p) => p.employment_status === "Active" && p.salary);
  if (active.length === 0) throw new Error("No active employees with salary on file to pay.");

  const unpaid = new Map<string, number>();
  (await listLeave(s))
    .filter((l) => l.status === "Approved" && l.type === "Loss of Pay" && String(l.from_date).slice(0, 7) === period)
    .forEach((l) => unpaid.set(l.worker_id, (unpaid.get(l.worker_id) ?? 0) + Number(l.days)));

  return withSession(s, async (tx) => {
    const dupe = (await tx.execute(sql`select id from payroll_run where period = ${first}::date limit 1`)).rows as Array<{ id: string }>;
    if (dupe[0]) throw new Error(`Payroll for ${period} already exists — open it instead.`);
    const run = (await tx.execute(sql`insert into payroll_run (tenant_id, period, status, created_by) values (${s.tenantId}, ${first}::date, 'Draft', ${s.userId}) returning id`)).rows[0] as { id: string };
    for (const p of active) {
      const c = computePay(Number(p.salary), unpaid.get(p.worker_id) ?? 0, dim);
      await tx.execute(sql`insert into payslip
        (tenant_id, run_id, worker_id, basic, hra, conveyance, special, gross, lop_days, lop, pf_employee, esi_employee, pt, tds, employer_pf, employer_esi, total_deductions, net)
        values (${s.tenantId}, ${run.id}, ${p.worker_id}, ${c.basic}, ${c.hra}, ${c.conveyance}, ${c.special}, ${c.gross}, ${c.lopDays}, ${c.lop}, ${c.pfEmployee}, ${c.esiEmployee}, ${c.pt}, ${c.tds}, ${c.employerPf}, ${c.employerEsi}, ${c.totalDeductions}, ${c.net})`);
    }
    await tx.execute(sql`insert into audit_log (tenant_id, actor_id, action, entity, entity_id, after) values (${s.tenantId}, ${s.userId}, 'payroll_run', 'payroll_run', ${run.id}, ${JSON.stringify({ period, headcount: active.length })}::jsonb)`);
    return run.id;
  });
}

export type RunDetail = { id: string; period: string; status: string; finalized_at: string | null; slips: PayslipRow[] };

export async function getRun(s: Session, runId: string): Promise<RunDetail | null> {
  if (!isHR(s)) return null;
  return withSession(s, async (tx) => {
    const rr = (await tx.execute(sql`select id, to_char(period,'YYYY-MM') as period, status, finalized_at from payroll_run where id = ${runId} limit 1`)).rows as Array<Record<string, unknown>>;
    if (!rr[0]) return null;
    const slips = (await tx.execute(sql`
      select p.*, w.full_name as name from payslip p join worker w on w.id = p.worker_id
      where p.run_id = ${runId} order by w.full_name
    `)).rows as Array<Record<string, unknown>>;
    return {
      id: rr[0].id as string, period: rr[0].period as string, status: rr[0].status as string,
      finalized_at: rr[0].finalized_at ? String(rr[0].finalized_at) : null,
      slips: slips.map(toSlip),
    };
  });
}

export async function finalizeRun(s: Session, runId: string): Promise<void> {
  if (!isHR(s)) throw new Error("Only HR can finalize payroll.");
  await withSession(s, async (tx) => {
    const res = await tx.execute(sql`update payroll_run set status='Finalized', finalized_by=${s.userId}, finalized_at=now() where id=${runId} and status='Draft'`);
    if (res.rowCount === 0) throw new Error("This payroll isn't a draft.");
    await tx.execute(sql`insert into audit_log (tenant_id, actor_id, action, entity, entity_id, after) values (${s.tenantId}, ${s.userId}, 'payroll_finalize', 'payroll_run', ${runId}, ${JSON.stringify({ status: "Finalized" })}::jsonb)`);
  });
}

export async function deleteRun(s: Session, runId: string): Promise<void> {
  if (!isHR(s)) throw new Error("Only HR can delete payroll.");
  await withSession(s, async (tx) => {
    const rr = (await tx.execute(sql`select status, to_char(period,'YYYY-MM') as period from payroll_run where id=${runId} limit 1`)).rows as Array<{ status: string; period: string }>;
    if (!rr[0]) throw new Error("Payroll run not found.");
    if (rr[0].status !== "Draft") throw new Error("Only a draft payroll can be deleted.");
    await tx.execute(sql`delete from payslip where run_id=${runId}`);
    await tx.execute(sql`delete from payroll_run where id=${runId}`);
    await tx.execute(sql`insert into audit_log (tenant_id, actor_id, action, entity, entity_id, before) values (${s.tenantId}, ${s.userId}, 'payroll_delete', 'payroll_run', ${runId}, ${JSON.stringify({ period: rr[0].period })}::jsonb)`);
  });
}

/** Finalized payslips for one worker (shown on their profile). HR any; employee
 *  self only (drafts stay hidden until the run is finalized). */
export type WorkerPayslip = PayslipRow & { period: string };
export async function getWorkerPayslips(s: Session, workerId: string): Promise<WorkerPayslip[]> {
  if (!(isHR(s) || workerId === s.workerId)) return [];
  try {
    return await withSession(s, async (tx) => {
      const r = (await tx.execute(sql`
        select p.*, w.full_name as name, to_char(r.period,'YYYY-MM') as period
        from payslip p join payroll_run r on r.id = p.run_id join worker w on w.id = p.worker_id
        where p.worker_id = ${workerId} and r.status = 'Finalized'
        order by r.period desc
      `)).rows as Array<Record<string, unknown>>;
      return r.map((x) => ({ ...toSlip(x), period: x.period as string }));
    });
  } catch {
    // Payroll tables not migrated yet — the profile page must still render.
    return [];
  }
}
