import { sql } from "drizzle-orm";
import { withSession, type Session } from "@/db/client";

export type AccessStatus = "active" | "invited" | "none";

/** Portal-access status per worker for the tenant: whether they have a linked
 *  login (active), a pending invite, or nothing yet. RLS-scoped to the tenant. */
export async function listAccess(s: Session): Promise<Map<string, AccessStatus>> {
  return withSession(s, async (tx) => {
    const r = (await tx.execute(sql`select worker_id, clerk_user_id from app_user where worker_id is not null`)).rows as Array<{ worker_id: string; clerk_user_id: string | null }>;
    const m = new Map<string, AccessStatus>();
    r.forEach((row) => m.set(row.worker_id, row.clerk_user_id ? "active" : "invited"));
    return m;
  });
}

/** HR/Owner invites an employee to the self-service portal: creates a pending
 *  app_user (role employee, linked to their worker) keyed by the worker's email.
 *  They become active when they next sign in with that verified email. */
export async function inviteEmployee(s: Session, workerId: string): Promise<{ email: string }> {
  if (!(s.role === "owner" || s.role === "hr_admin")) throw new Error("Only HR can invite employees.");
  return withSession(s, async (tx) => {
    const w = (await tx.execute(sql`select email, full_name from worker where id = ${workerId} limit 1`)).rows as Array<{ email: string | null; full_name: string }>;
    if (!w[0]) throw new Error("Employee not found.");
    if (!w[0].email) throw new Error(`Add an email address for ${w[0].full_name} before inviting.`);

    const dupe = (await tx.execute(sql`select id from app_user where lower(email) = lower(${w[0].email}) and tenant_id = ${s.tenantId} limit 1`)).rows as Array<{ id: string }>;
    if (dupe[0]) throw new Error("That email already has portal access in this company.");

    await tx.execute(sql`insert into app_user (tenant_id, email, role, worker_id) values (${s.tenantId}, ${w[0].email}, 'employee', ${workerId})`);
    await tx.execute(sql`insert into audit_log (tenant_id, actor_id, action, entity, entity_id, after) values (${s.tenantId}, ${s.userId}, 'invite', 'worker', ${workerId}, ${JSON.stringify({ email: w[0].email })}::jsonb)`);
    return { email: w[0].email };
  });
}
