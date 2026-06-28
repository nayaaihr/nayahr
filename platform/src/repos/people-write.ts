import { sql } from "drizzle-orm";
import { withSession, type Session } from "@/db/client";

export type NewWorker = {
  fullName: string;
  email: string | null;
  title: string;
  departmentId: string | null;
  locationId: string | null;
  hiredOn: string; // YYYY-MM-DD
  salary: number;  // annual INR
};

/**
 * Create an employee — the effective-dated write path.
 * In ONE transaction (atomic, RLS-scoped to the tenant):
 *   worker  +  Hire job_event (effective_date = hire date)  +  compensation_event  +  audit_log
 * Permission-gated: only HR Admin / Owner may create.
 */
export async function createWorker(s: Session, input: NewWorker): Promise<string> {
  if (s.role !== "hr_admin" && s.role !== "owner") {
    throw new Error("Not authorized — only HR Admin or Owner can add employees.");
  }
  if (!input.fullName.trim()) throw new Error("Employee name is required.");

  return withSession(s, async (tx) => {
    const w = await tx.execute(sql`
      insert into worker (tenant_id, full_name, email, hired_on)
      values (${s.tenantId}, ${input.fullName.trim()}, ${input.email}, ${input.hiredOn}::date)
      returning id
    `);
    const workerId = (w.rows as Array<{ id: string }>)[0].id;

    await tx.execute(sql`
      insert into job_event
        (tenant_id, worker_id, effective_date, seq, event_type, title, department_id, location_id, employment_status, recorded_by)
      values
        (${s.tenantId}, ${workerId}, ${input.hiredOn}::date, 0, 'Hire', ${input.title || "Employee"},
         ${input.departmentId}, ${input.locationId}, 'Active', ${s.userId})
    `);

    await tx.execute(sql`
      insert into compensation_event
        (tenant_id, worker_id, effective_date, seq, amount, currency, recorded_by)
      values
        (${s.tenantId}, ${workerId}, ${input.hiredOn}::date, 0, ${input.salary || 0}, 'INR', ${s.userId})
    `);

    await tx.execute(sql`
      insert into audit_log
        (tenant_id, actor_id, action, entity, entity_id, effective_date, after)
      values
        (${s.tenantId}, ${s.userId}, 'create', 'worker', ${workerId}, ${input.hiredOn}::date,
         ${JSON.stringify(input)}::jsonb)
    `);

    return workerId;
  });
}
