import { sql } from "drizzle-orm";
import { withSession, type Session } from "@/db/client";
import { listPeople } from "@/repos/people";

export type LeaveRow = {
  id: string;
  worker_id: string;
  employee: string;
  type: string;
  from_date: string;
  days: number;
  status: string;
  decided_at: string | null;
};

/** Indian standard leave types with typical annual entitlements (days).
 *  allowance 0 = no fixed balance (Comp-off accrues; Loss of Pay is unpaid). */
export const LEAVE_TYPES: Array<{ name: string; allowance: number; note?: string }> = [
  { name: "Earned (Privilege)", allowance: 18 },
  { name: "Casual", allowance: 12 },
  { name: "Sick", allowance: 12 },
  { name: "Maternity", allowance: 182, note: "26 weeks" },
  { name: "Paternity", allowance: 15 },
  { name: "Bereavement", allowance: 5 },
  { name: "Marriage", allowance: 3 },
  { name: "Comp-off", allowance: 0, note: "accrued" },
  { name: "Loss of Pay", allowance: 0, note: "unpaid" },
];
const ALLOWANCE = new Map(LEAVE_TYPES.map((t) => [t.name, t.allowance]));
/** Balance tiles to surface on the leave page (the accruable, paid types). */
export const BALANCE_TYPES = ["Earned (Privilege)", "Casual", "Sick"] as const;

export type LeaveBalance = { type: string; allowance: number; used: number; remaining: number };

/** Per-type leave balances for a worker (allowance − approved days of that type). */
export function balancesFor(rows: LeaveRow[], workerId: string | null): LeaveBalance[] {
  return BALANCE_TYPES.map((type) => {
    const allowance = ALLOWANCE.get(type) ?? 0;
    const used = workerId
      ? rows.filter((r) => r.worker_id === workerId && r.type === type && r.status === "Approved").reduce((sum, r) => sum + (Number(r.days) || 0), 0)
      : 0;
    return { type, allowance, used, remaining: Math.max(0, allowance - used) };
  });
}

/**
 * Leave requests the signed-in user can see — scoped to the same worker set as
 * the People view (employee → self, manager → team, admin/owner → org). Tenant
 * isolation is enforced by RLS underneath.
 */
export async function listLeave(s: Session): Promise<LeaveRow[]> {
  const people = await listPeople(s);
  const ids = people.map((p) => p.worker_id);
  const nameById = new Map(people.map((p) => [p.worker_id, p.full_name]));
  if (!ids.length) return [];

  const inList = sql.join(ids.map((id) => sql`${id}`), sql`, `);
  return withSession(s, async (tx) => {
    const r = await tx.execute(sql`
      select id, worker_id, type, from_date, days, status, decided_at
      from leave_request
      where worker_id::text in (${inList})
      order by created_at desc
    `);
    return (r.rows as Array<Omit<LeaveRow, "employee">>).map((row) => ({
      ...row,
      employee: nameById.get(row.worker_id) ?? "—",
    }));
  });
}

export async function requestLeave(
  s: Session,
  input: { type: string; fromDate: string; days: number },
): Promise<void> {
  if (!s.workerId) throw new Error("Only an employee with a profile can request leave.");
  await withSession(s, async (tx) => {
    await tx.execute(sql`
      insert into leave_request (tenant_id, worker_id, type, from_date, days, status)
      values (${s.tenantId}, ${s.workerId}, ${input.type}, ${input.fromDate}::date, ${input.days}, 'Pending')
    `);
    await tx.execute(sql`
      insert into audit_log (tenant_id, actor_id, action, entity, after)
      values (${s.tenantId}, ${s.userId}, 'leave_request', 'leave_request', ${JSON.stringify(input)}::jsonb)
    `);
  });
}

export async function decideLeave(
  s: Session,
  leaveId: string,
  status: "Approved" | "Rejected",
): Promise<void> {
  if (s.role === "employee") throw new Error("Not authorized to approve leave.");

  // Managers may only decide on their own team's requests; admin/owner on any.
  let allowed: Set<string> | null = null;
  if (s.role === "manager") {
    const team = await listPeople(s);
    allowed = new Set(team.map((p) => p.worker_id));
  }

  await withSession(s, async (tx) => {
    const r = await tx.execute(sql`select worker_id from leave_request where id = ${leaveId} limit 1`);
    const row = (r.rows as Array<{ worker_id: string }>)[0];
    if (!row) throw new Error("Request not found.");
    if (allowed && !allowed.has(row.worker_id)) throw new Error("That request isn't from your team.");

    await tx.execute(sql`
      update leave_request set status = ${status}, decided_by = ${s.userId}, decided_at = now()
      where id = ${leaveId}
    `);
    await tx.execute(sql`
      insert into audit_log (tenant_id, actor_id, action, entity, entity_id, after)
      values (${s.tenantId}, ${s.userId}, 'leave_decision', 'leave_request', ${leaveId}, ${JSON.stringify({ status })}::jsonb)
    `);
  });
}
