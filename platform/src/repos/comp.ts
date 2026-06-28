import { sql } from "drizzle-orm";
import { listPeople } from "@/repos/people";
import { withSession, type Session } from "@/db/client";

// Pay bands (annual INR). Level derived from job title.
const BANDS = {
  Associate: { min: 400000, mid: 600000, max: 850000 },
  Senior: { min: 700000, mid: 1000000, max: 1400000 },
  Manager: { min: 1200000, mid: 1700000, max: 2400000 },
  Leadership: { min: 2000000, mid: 2800000, max: 4000000 },
} as const;
export const BAND_ORDER = ["Associate", "Senior", "Manager", "Leadership"] as const;
type Level = keyof typeof BANDS;

export function levelOf(title: string): Level {
  const t = title || "";
  if (/Head|VP|Director|Chief/.test(t)) return "Leadership";
  if (/Manager|Lead/.test(t)) return "Manager";
  if (/Senior|Sr\.?|Principal|Staff/.test(t)) return "Senior";
  return "Associate";
}
const median = (a: number[]) => {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export type CompRow = {
  id: string; name: string; level: Level; salary: number;
  min: number; mid: number; max: number; compaRatio: number; rangePct: number;
  status: "In range" | "Below" | "Above";
};
export type CompStats = {
  count: number; payroll: number; avg: number; median: number; below: number; above: number;
  bands: Array<{ level: Level; min: number; mid: number; max: number; people: number; avgCompa: number | null }>;
};

/** Compensation for the visible (role-scoped) active employees. Reuses the
 *  effective-dated salary already computed by listPeople — no extra query. */
export async function listComp(s: Session): Promise<{ rows: CompRow[]; stats: CompStats }> {
  const people = await listPeople(s);
  const active = people.filter((p) => p.employment_status === "Active");

  const rows: CompRow[] = active
    .map((p) => {
      const level = levelOf(p.title);
      const b = BANDS[level];
      const salary = Number(p.salary) || 0;
      const rangePct = Math.max(0, Math.min(100, ((salary - b.min) / (b.max - b.min)) * 100));
      return {
        id: p.worker_id, name: p.full_name, level, salary,
        min: b.min, mid: b.mid, max: b.max,
        compaRatio: b.mid ? +(salary / b.mid).toFixed(2) : 0,
        rangePct,
        status: (salary < b.min ? "Below" : salary > b.max ? "Above" : "In range") as CompRow["status"],
      };
    })
    .sort((a, b) => b.salary - a.salary);

  const sal = rows.map((r) => r.salary);
  const payroll = sal.reduce((s2, x) => s2 + x, 0);
  const bands = BAND_ORDER.map((level) => {
    const inb = rows.filter((r) => r.level === level);
    return {
      level, min: BANDS[level].min, mid: BANDS[level].mid, max: BANDS[level].max,
      people: inb.length,
      avgCompa: inb.length ? +(inb.reduce((s2, r) => s2 + r.compaRatio, 0) / inb.length).toFixed(2) : null,
    };
  });

  return {
    rows,
    stats: {
      count: rows.length, payroll,
      avg: rows.length ? Math.round(payroll / rows.length) : 0,
      median: Math.round(median(sal)),
      below: rows.filter((r) => r.status === "Below").length,
      above: rows.filter((r) => r.status === "Above").length,
      bands,
    },
  };
}

export type CompHistoryRow = { effective_date: string; amount: number };

/** Effective-dated pay history per visible worker (newest first), from compensation_event. */
export async function listCompHistory(s: Session): Promise<Map<string, CompHistoryRow[]>> {
  const people = await listPeople(s);
  const ids = people.map((p) => p.worker_id);
  if (!ids.length) return new Map();
  const inList = sql.join(ids.map((id) => sql`${id}`), sql`, `);
  return withSession(s, async (tx) => {
    const r = (await tx.execute(sql`select worker_id, effective_date, amount from compensation_event
      where worker_id::text in (${inList}) order by effective_date desc, seq desc`)).rows as Array<Record<string, unknown>>;
    const m = new Map<string, CompHistoryRow[]>();
    r.forEach((row) => {
      const wid = row.worker_id as string;
      const arr = m.get(wid) ?? [];
      arr.push({ effective_date: String(row.effective_date).slice(0, 10), amount: Number(row.amount) });
      m.set(wid, arr);
    });
    return m;
  });
}

// ── Compensation change workflow ───────────────────────────────────────────
export type CompChange = {
  id: string; worker_id: string; employee: string;
  current_amount: number | null; new_amount: number; effective_date: string;
  reason: string | null; status: string;
};
const canRequestComp = (s: Session) => s.role === "owner" || s.role === "hr_admin" || s.role === "manager";
const canApproveComp = (s: Session) => s.role === "owner" || s.role === "hr_admin";

/** Pending + recent comp-change requests, scoped to the people the viewer sees. */
export async function listCompChanges(s: Session): Promise<CompChange[]> {
  if (!canRequestComp(s)) return [];
  const people = await listPeople(s);
  const ids = people.map((p) => p.worker_id);
  const nameById = new Map(people.map((p) => [p.worker_id, p.full_name]));
  if (!ids.length) return [];
  const inList = sql.join(ids.map((id) => sql`${id}`), sql`, `);
  return withSession(s, async (tx) => {
    const r = (await tx.execute(sql`select id, worker_id, current_amount, new_amount, effective_date, reason, status
      from comp_change_request where worker_id::text in (${inList}) order by created_at desc`)).rows as Array<Record<string, unknown>>;
    return r.map((row) => ({
      id: row.id as string, worker_id: row.worker_id as string, employee: nameById.get(row.worker_id as string) ?? "—",
      current_amount: row.current_amount != null ? Number(row.current_amount) : null,
      new_amount: Number(row.new_amount), effective_date: String(row.effective_date).slice(0, 10),
      reason: (row.reason as string) ?? null, status: row.status as string,
    }));
  });
}

/** Manager (own team) or HR initiates a pay change → Pending HR approval. */
export async function requestCompChange(s: Session, input: { workerId: string; newAmount: number; effectiveDate: string; reason: string }): Promise<void> {
  if (!canRequestComp(s)) throw new Error("Not authorized to request pay changes.");
  if (!(input.newAmount > 0)) throw new Error("Enter a valid new amount.");
  if (!input.effectiveDate) throw new Error("Pick an effective date.");
  const team = new Set((await listPeople(s)).map((p) => p.worker_id));
  if (!team.has(input.workerId)) throw new Error("That employee isn't in your scope.");
  await withSession(s, async (tx) => {
    const cur = (await tx.execute(sql`select amount from compensation_event where worker_id = ${input.workerId} order by effective_date desc, seq desc limit 1`)).rows as Array<{ amount: string }>;
    await tx.execute(sql`insert into comp_change_request (tenant_id, worker_id, current_amount, new_amount, effective_date, reason, status, requested_by)
      values (${s.tenantId}, ${input.workerId}, ${cur[0]?.amount ?? null}, ${input.newAmount}, ${input.effectiveDate}::date, ${input.reason.trim() || null}, 'Pending', ${s.userId})`);
    await tx.execute(sql`insert into audit_log (tenant_id, actor_id, action, entity, entity_id, after) values (${s.tenantId}, ${s.userId}, 'comp_change_request', 'worker', ${input.workerId}, ${JSON.stringify({ new_amount: input.newAmount, effective_date: input.effectiveDate })}::jsonb)`);
  });
}

/** HR approves → writes an effective-dated compensation_event; or rejects. */
export async function decideCompChange(s: Session, reqId: string, approve: boolean): Promise<void> {
  if (!canApproveComp(s)) throw new Error("Only HR can approve pay changes.");
  await withSession(s, async (tx) => {
    const r = (await tx.execute(sql`select worker_id, new_amount, effective_date from comp_change_request where id = ${reqId} and status = 'Pending' limit 1`)).rows as Array<{ worker_id: string; new_amount: string; effective_date: string }>;
    if (!r[0]) throw new Error("This request isn't pending.");
    if (approve) {
      const eff = String(r[0].effective_date).slice(0, 10);
      const seqRow = (await tx.execute(sql`select coalesce(max(seq), -1) + 1 as next from compensation_event where worker_id = ${r[0].worker_id} and effective_date = ${eff}::date`)).rows as Array<{ next: number }>;
      await tx.execute(sql`insert into compensation_event (tenant_id, worker_id, effective_date, seq, amount, currency, recorded_by)
        values (${s.tenantId}, ${r[0].worker_id}, ${eff}::date, ${seqRow[0].next}, ${r[0].new_amount}, 'INR', ${s.userId})`);
    }
    await tx.execute(sql`update comp_change_request set status = ${approve ? "Approved" : "Rejected"}, decided_by = ${s.userId}, decided_at = now() where id = ${reqId}`);
    await tx.execute(sql`insert into audit_log (tenant_id, actor_id, action, entity, entity_id, after) values (${s.tenantId}, ${s.userId}, ${approve ? "comp_change_approve" : "comp_change_reject"}, 'comp_change_request', ${reqId}, ${JSON.stringify({ approved: approve })}::jsonb)`);
  });
}
