import { sql } from "drizzle-orm";
import { withSession, type Session } from "@/db/client";

export type AdminRow = {
  id: string;            // app_user id
  email: string;
  name: string | null;   // from the linked worker, if any
  role: "owner" | "hr_admin";
  active: boolean;       // has actually signed in (clerk_user_id set)
  isSelf: boolean;
};
export type MemberOpt = { id: string; label: string };

const isOwner = (s: Session) => s.role === "owner"; // view-as downgrades role, so this also blocks previewing owners

type Row = { id: string; email: string; role: string; clerk_user_id: string | null; full_name: string | null };
const toName = (r: Row) => r.full_name ?? null;

/** Owner-only view for the Manage admins screen:
 *  - `admins`    → the Owner + every HR Admin (the people with elevated access)
 *  - `grantable` → other members (employees/managers with a login or pending invite)
 *                  who can be promoted to HR Admin. */
export async function listAdmins(s: Session): Promise<{ admins: AdminRow[]; grantable: MemberOpt[] }> {
  if (!isOwner(s)) return { admins: [], grantable: [] };
  return withSession(s, async (tx) => {
    const rows = (await tx.execute(sql`
      select u.id, u.email, u.role, u.clerk_user_id, w.full_name
      from app_user u
      left join worker w on w.id = u.worker_id
      order by
        case u.role when 'owner' then 0 when 'hr_admin' then 1 when 'manager' then 2 else 3 end,
        lower(coalesce(w.full_name, u.email))
    `)).rows as Row[];

    const admins: AdminRow[] = rows
      .filter((r) => r.role === "owner" || r.role === "hr_admin")
      .map((r) => ({
        id: r.id, email: r.email, name: toName(r), role: r.role as "owner" | "hr_admin",
        active: !!r.clerk_user_id, isSelf: r.id === s.userId,
      }));

    const grantable: MemberOpt[] = rows
      .filter((r) => r.role === "employee" || r.role === "manager")
      .map((r) => ({ id: r.id, label: `${toName(r) ?? r.email}${toName(r) ? ` · ${r.email}` : ""}${r.clerk_user_id ? "" : " (invited)"}` }));

    return { admins, grantable };
  });
}

async function requireOwner(s: Session) {
  if (!isOwner(s)) throw new Error("Only the account owner can manage administrators.");
}

/** Owner grants HR Admin access to an existing member. */
export async function grantAdmin(s: Session, appUserId: string): Promise<void> {
  await requireOwner(s);
  return withSession(s, async (tx) => {
    const t = (await tx.execute(sql`select id, role from app_user where id = ${appUserId} limit 1`)).rows as Array<{ id: string; role: string }>;
    if (!t[0]) throw new Error("That member no longer exists.");
    if (t[0].role === "owner") throw new Error("That user is the owner.");
    if (t[0].role === "hr_admin") throw new Error("That user is already an HR Admin.");
    await tx.execute(sql`update app_user set role = 'hr_admin' where id = ${appUserId}`);
    await tx.execute(sql`insert into audit_log (tenant_id, actor_id, action, entity, entity_id, before, after) values (${s.tenantId}, ${s.userId}, 'grant_admin', 'app_user', ${appUserId}, ${JSON.stringify({ role: t[0].role })}::jsonb, ${JSON.stringify({ role: "hr_admin" })}::jsonb)`);
  });
}

/** Owner revokes HR Admin access (back to a regular member). */
export async function revokeAdmin(s: Session, appUserId: string): Promise<void> {
  await requireOwner(s);
  if (appUserId === s.userId) throw new Error("You can't revoke your own access. Transfer ownership first.");
  return withSession(s, async (tx) => {
    const t = (await tx.execute(sql`select id, role from app_user where id = ${appUserId} limit 1`)).rows as Array<{ id: string; role: string }>;
    if (!t[0]) throw new Error("That member no longer exists.");
    if (t[0].role === "owner") throw new Error("You can't revoke the owner. Transfer ownership first.");
    if (t[0].role !== "hr_admin") throw new Error("That user is not an HR Admin.");
    await tx.execute(sql`update app_user set role = 'employee' where id = ${appUserId}`);
    await tx.execute(sql`insert into audit_log (tenant_id, actor_id, action, entity, entity_id, before, after) values (${s.tenantId}, ${s.userId}, 'revoke_admin', 'app_user', ${appUserId}, ${JSON.stringify({ role: "hr_admin" })}::jsonb, ${JSON.stringify({ role: "employee" })}::jsonb)`);
  });
}

/** Owner transfers ownership to another admin. Atomic: the target becomes Owner
 *  and the current owner steps down to HR Admin, keeping exactly one owner. */
export async function transferOwnership(s: Session, appUserId: string): Promise<void> {
  await requireOwner(s);
  if (appUserId === s.userId) throw new Error("You are already the owner.");
  return withSession(s, async (tx) => {
    const t = (await tx.execute(sql`select id, role, clerk_user_id from app_user where id = ${appUserId} limit 1`)).rows as Array<{ id: string; role: string; clerk_user_id: string | null }>;
    if (!t[0]) throw new Error("That member no longer exists.");
    if (!t[0].clerk_user_id) throw new Error("You can only transfer ownership to someone who has signed in at least once.");
    if (t[0].role === "owner") throw new Error("That user is already the owner.");
    await tx.execute(sql`update app_user set role = 'owner' where id = ${appUserId}`);
    await tx.execute(sql`update app_user set role = 'hr_admin' where id = ${s.userId}`);
    await tx.execute(sql`insert into audit_log (tenant_id, actor_id, action, entity, entity_id, before, after) values (${s.tenantId}, ${s.userId}, 'transfer_ownership', 'app_user', ${appUserId}, ${JSON.stringify({ owner: s.userId })}::jsonb, ${JSON.stringify({ owner: appUserId })}::jsonb)`);
  });
}
