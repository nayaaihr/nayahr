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
  paid_days: number | null;
  lop_days: number; lop: number; pf_employee: number; esi_employee: number; pt: number; tds: number;
  employer_pf: number; employer_esi: number; total_deductions: number; net: number;
};

function toSlip(x: Record<string, unknown>): PayslipRow {
  return {
    id: x.id as string, worker_id: x.worker_id as string, name: x.name as string,
    basic: num(x.basic), hra: num(x.hra), conveyance: num(x.conveyance), special: num(x.special), gross: num(x.gross),
    paid_days: x.paid_days != null ? num(x.paid_days) : null,
    lop_days: num(x.lop_days), lop: num(x.lop), pf_employee: num(x.pf_employee), esi_employee: num(x.esi_employee),
    pt: num(x.pt), tds: num(x.tds), employer_pf: num(x.employer_pf), employer_esi: num(x.employer_esi),
    total_deductions: num(x.total_deductions), net: num(x.net),
  };
}

/** Days a worker was employed during the pay month (for hire-date proration):
 *  full month if hired earlier, the tail of the month if hired during it, 0 if
 *  hired after it. */
function employedDaysInMonth(hiredOn: string, year: number, month: number, daysInMonth: number): number {
  const [hy, hm, hd] = hiredOn.slice(0, 10).split("-").map(Number);
  if (hy < year || (hy === year && hm < month)) return daysInMonth;
  if (hy === year && hm === month) return Math.max(0, daysInMonth - hd + 1);
  return 0;
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

type PayrollInputs = { active: Awaited<ReturnType<typeof listPeople>>; unpaid: Map<string, number> };

/** The people to pay + their unpaid-leave days for a month. Read outside the
 *  write transaction (shared by create + regenerate). */
async function payrollInputs(s: Session, period: string): Promise<PayrollInputs> {
  const active = (await listPeople(s)).filter((p) => p.employment_status === "Active" && p.salary);
  const unpaid = new Map<string, number>();
  (await listLeave(s))
    .filter((l) => l.status === "Approved" && l.type === "Loss of Pay" && String(l.from_date).slice(0, 7) === period)
    .forEach((l) => unpaid.set(l.worker_id, (unpaid.get(l.worker_id) ?? 0) + Number(l.days)));
  return { active, unpaid };
}

/** Compute + insert a payslip for each employed worker; returns how many were paid.
 *  Runs inside an open transaction. */
async function insertPayslips(s: Session, tx: Parameters<Parameters<typeof withSession>[1]>[0], runId: string, period: string, { active, unpaid }: PayrollInputs): Promise<number> {
  const dim = daysInPeriod(period);
  const [py, pm] = period.split("-").map(Number);
  let paid = 0;
  for (const p of active) {
    const employedDays = employedDaysInMonth(String(p.hired_on), py, pm, dim);
    if (employedDays <= 0) continue; // hired after this month — not on this payroll
    const c = computePay(Number(p.salary), unpaid.get(p.worker_id) ?? 0, dim, employedDays);
    await tx.execute(sql`insert into payslip
      (tenant_id, run_id, worker_id, basic, hra, conveyance, special, gross, paid_days, lop_days, lop, pf_employee, esi_employee, pt, tds, employer_pf, employer_esi, total_deductions, net)
      values (${s.tenantId}, ${runId}, ${p.worker_id}, ${c.basic}, ${c.hra}, ${c.conveyance}, ${c.special}, ${c.gross}, ${c.paidDays}, ${c.lopDays}, ${c.lop}, ${c.pfEmployee}, ${c.esiEmployee}, ${c.pt}, ${c.tds}, ${c.employerPf}, ${c.employerEsi}, ${c.totalDeductions}, ${c.net})`);
    paid++;
  }
  return paid;
}

/** Create a draft run for a "YYYY-MM" month: snapshot a payslip for every active,
 *  salaried employee, prorating LOP from approved "Loss of Pay" leave that month. */
export async function createRun(s: Session, period: string): Promise<string> {
  if (!isHR(s)) throw new Error("Only HR can run payroll.");
  if (!/^\d{4}-\d{2}$/.test(period)) throw new Error("Pick a valid month.");
  const first = `${period}-01`;
  const inputs = await payrollInputs(s, period);
  if (inputs.active.length === 0) throw new Error("No active employees with salary on file to pay.");

  return withSession(s, async (tx) => {
    const dupe = (await tx.execute(sql`select id from payroll_run where period = ${first}::date limit 1`)).rows as Array<{ id: string }>;
    if (dupe[0]) throw new Error(`Payroll for ${period} already exists — open it instead.`);
    const run = (await tx.execute(sql`insert into payroll_run (tenant_id, period, status, created_by) values (${s.tenantId}, ${first}::date, 'Draft', ${s.userId}) returning id`)).rows[0] as { id: string };
    const paid = await insertPayslips(s, tx, run.id, period, inputs);
    if (paid === 0) throw new Error("No employees were employed during this month.");
    await tx.execute(sql`insert into audit_log (tenant_id, actor_id, action, entity, entity_id, after) values (${s.tenantId}, ${s.userId}, 'payroll_run', 'payroll_run', ${run.id}, ${JSON.stringify({ period, headcount: paid })}::jsonb)`);
    return run.id;
  });
}

/** Reopen a finalized run back to Draft so HR can correct it (NH-106). Payslips
 *  stay put but are hidden from employees again until the run is re-finalized. */
export async function reopenRun(s: Session, runId: string): Promise<void> {
  if (!isHR(s)) throw new Error("Only HR can reopen payroll.");
  await withSession(s, async (tx) => {
    const res = await tx.execute(sql`update payroll_run set status='Draft', finalized_by=null, finalized_at=null where id=${runId} and status='Finalized'`);
    if (res.rowCount === 0) throw new Error("This payroll isn't finalized.");
    await tx.execute(sql`insert into audit_log (tenant_id, actor_id, action, entity, entity_id, after) values (${s.tenantId}, ${s.userId}, 'payroll_reopen', 'payroll_run', ${runId}, ${JSON.stringify({ status: "Draft" })}::jsonb)`);
  });
}

/** Recompute a draft run's payslips from current salary / leave / proration.
 *  Use after reopening + fixing the underlying data. */
export async function regenerateRun(s: Session, runId: string): Promise<void> {
  if (!isHR(s)) throw new Error("Only HR can regenerate payroll.");
  const meta = (await withSession(s, async (tx) =>
    (await tx.execute(sql`select status, to_char(period,'YYYY-MM') as period from payroll_run where id=${runId} limit 1`)).rows as Array<{ status: string; period: string }>,
  ))[0];
  if (!meta) throw new Error("Payroll run not found.");
  if (meta.status !== "Draft") throw new Error("Only a draft payroll can be regenerated — reopen it first.");
  const inputs = await payrollInputs(s, meta.period);
  await withSession(s, async (tx) => {
    await tx.execute(sql`delete from payslip where run_id=${runId}`);
    const paid = await insertPayslips(s, tx, runId, meta.period, inputs);
    if (paid === 0) throw new Error("No employees were employed during this month.");
    await tx.execute(sql`insert into audit_log (tenant_id, actor_id, action, entity, entity_id, after) values (${s.tenantId}, ${s.userId}, 'payroll_regenerate', 'payroll_run', ${runId}, ${JSON.stringify({ period: meta.period, headcount: paid })}::jsonb)`);
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

// ── NH-105: exports for a run ────────────────────────────────────────────────

export type BankLine = { name: string; bankAccount: string | null; bankIfsc: string | null; upiId: string | null; net: number };
export type BankExport = { period: string; status: string; rows: BankLine[]; total: number; missing: number };

/** True when a worker can be paid — bank account+IFSC, or a UPI ID. */
export function hasPayout(l: { bankAccount: string | null; bankIfsc: string | null; upiId: string | null }): boolean {
  return (!!l.bankAccount && !!l.bankIfsc) || !!l.upiId;
}

/** Net-pay disbursement list for a bank upload. Each employee is paid by NEFT
 *  (account + IFSC) or, if that's absent, by UPI. HR/Owner only. */
export async function getBankExport(s: Session, runId: string): Promise<BankExport | null> {
  if (!isHR(s)) return null;
  return withSession(s, async (tx) => {
    const rr = (await tx.execute(sql`select to_char(period,'YYYY-MM') as period, status from payroll_run where id = ${runId} limit 1`)).rows as Array<Record<string, unknown>>;
    if (!rr[0]) return null;
    const rows = (await tx.execute(sql`
      select w.full_name as name, w.bank_account, w.bank_ifsc, w.upi_id, p.net
      from payslip p join worker w on w.id = p.worker_id
      where p.run_id = ${runId} order by w.full_name`)).rows as Array<Record<string, unknown>>;
    const lines: BankLine[] = rows.map((x) => ({
      name: x.name as string, bankAccount: (x.bank_account as string) ?? null,
      bankIfsc: (x.bank_ifsc as string) ?? null, upiId: (x.upi_id as string) ?? null, net: num(x.net),
    }));
    return {
      period: rr[0].period as string, status: rr[0].status as string, rows: lines,
      total: lines.reduce((a, l) => a + l.net, 0),
      missing: lines.filter((l) => !hasPayout(l)).length,
    };
  });
}

export type WorkerPayout = { bankAccount: string | null; bankIfsc: string | null; upiId: string | null };

/** Payout details for every worker in a run, keyed by worker_id. Resilient: if
 *  the bank columns aren't migrated yet, returns {} so the run page still renders. */
export async function getRunPayouts(s: Session, runId: string): Promise<Record<string, WorkerPayout>> {
  if (!isHR(s)) return {};
  try {
    return await withSession(s, async (tx) => {
      const rows = (await tx.execute(sql`
        select p.worker_id, w.bank_account, w.bank_ifsc, w.upi_id
        from payslip p join worker w on w.id = p.worker_id
        where p.run_id = ${runId}`)).rows as Array<Record<string, unknown>>;
      const map: Record<string, WorkerPayout> = {};
      for (const x of rows) map[x.worker_id as string] = {
        bankAccount: (x.bank_account as string) ?? null, bankIfsc: (x.bank_ifsc as string) ?? null, upiId: (x.upi_id as string) ?? null,
      };
      return map;
    });
  } catch {
    return {};
  }
}

export type StatutoryLine = { name: string; pan: string | null; uan: string | null; gross: number; pfEmployee: number; employerPf: number; esiEmployee: number; employerEsi: number; pt: number; tds: number };
export type StatutoryTotals = { gross: number; pfEmployee: number; employerPf: number; esiEmployee: number; employerEsi: number; pt: number; tds: number };
export type StatutorySummary = { period: string; status: string; rows: StatutoryLine[]; totals: StatutoryTotals };

/** PF / ESI / PT / TDS breakdown + totals for statutory filing. HR/Owner only. */
export async function getStatutorySummary(s: Session, runId: string): Promise<StatutorySummary | null> {
  if (!isHR(s)) return null;
  return withSession(s, async (tx) => {
    const rr = (await tx.execute(sql`select to_char(period,'YYYY-MM') as period, status from payroll_run where id = ${runId} limit 1`)).rows as Array<Record<string, unknown>>;
    if (!rr[0]) return null;
    const rows = (await tx.execute(sql`
      select w.full_name as name, w.pan, w.uan, p.gross, p.pf_employee, p.employer_pf, p.esi_employee, p.employer_esi, p.pt, p.tds
      from payslip p join worker w on w.id = p.worker_id
      where p.run_id = ${runId} order by w.full_name`)).rows as Array<Record<string, unknown>>;
    const lines: StatutoryLine[] = rows.map((x) => ({
      name: x.name as string, pan: (x.pan as string) ?? null, uan: (x.uan as string) ?? null,
      gross: num(x.gross), pfEmployee: num(x.pf_employee), employerPf: num(x.employer_pf),
      esiEmployee: num(x.esi_employee), employerEsi: num(x.employer_esi), pt: num(x.pt), tds: num(x.tds),
    }));
    const sum = (f: (l: StatutoryLine) => number) => lines.reduce((a, l) => a + f(l), 0);
    return {
      period: rr[0].period as string, status: rr[0].status as string, rows: lines,
      totals: {
        gross: sum((l) => l.gross), pfEmployee: sum((l) => l.pfEmployee), employerPf: sum((l) => l.employerPf),
        esiEmployee: sum((l) => l.esiEmployee), employerEsi: sum((l) => l.employerEsi), pt: sum((l) => l.pt), tds: sum((l) => l.tds),
      },
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
