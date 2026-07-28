import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { cookies } from "next/headers";
import { auth, currentUser } from "@clerk/nextjs/server";
import { sql } from "drizzle-orm";
import { db, type Session, type Role } from "@/db/client";

/**
 * Identity comes from Clerk. We resolve the user's tenant + role by looking up
 * their `app_user` (visible via the app_user_self RLS policy, keyed by the
 * app.clerk_user GUC — works across tenants).
 *
 * Phase 5 — SELF-SERVE ONBOARDING: a brand-new sign-in (no app_user yet) gets a
 * fresh tenant of their own (company), and becomes its `owner`. They then import
 * their roster. (No more claiming a fixed demo tenant.)
 *
 * DEV override: set DEV_ROLE (dev only) to preview org/team/self scopes on the
 * seeded demo tenant without creating extra Clerk users.
 */

type AppUserRow = { id: string; tenant_id: string; role: string; worker_id: string | null };

/** A signed-in Clerk user who is not a member of any tenant and isn't allowed to
 *  self-provision one. The app renders a friendly "request an invite" screen. */
export class NoWorkspaceError extends Error {
  constructor() { super("This account hasn't been invited to a workspace."); this.name = "NoWorkspaceError"; }
}

/** Emails/domains permitted to create a brand-new company (tenant) on sign-in.
 *  Comma-separated `SIGNUP_ALLOWLIST` (e.g. "founder@acme.com, acme.com").
 *  Empty/unset ⇒ pure invite-only: nobody gets a workspace without an invite. */
function canSelfProvision(email: string): boolean {
  const raw = process.env.SIGNUP_ALLOWLIST;
  if (!raw) return false;
  const e = email.toLowerCase();
  const domain = e.split("@")[1] ?? "";
  return raw.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
    .some((entry) => entry === e || entry === domain);
}

function companyFromEmail(email: string): string {
  const domain = email.split("@")[1]?.split(".")[0];
  if (!domain || ["gmail", "outlook", "yahoo", "hotmail", "icloud", "proton"].includes(domain.toLowerCase())) {
    return "My Company";
  }
  return domain.charAt(0).toUpperCase() + domain.slice(1);
}

async function provisionNewTenant(clerkUserId: string, email: string): Promise<AppUserRow> {
  return db.transaction(async (tx) => {
    const tid = (await tx.execute(sql`select gen_random_uuid() as id`)).rows[0].id as string;
    await tx.execute(sql`select set_config('app.tenant', ${tid}, true)`);
    // name_confirmed=false → the owner is prompted to set their real company name on first login.
    await tx.execute(sql`insert into tenant (id, name, country, name_confirmed) values (${tid}, ${companyFromEmail(email)}, 'IN', false)`);
    const u = await tx.execute(sql`
      insert into app_user (tenant_id, email, role, clerk_user_id)
      values (${tid}, ${email}, 'owner', ${clerkUserId})
      returning id, tenant_id, role, worker_id
    `);
    return (u.rows as AppUserRow[])[0];
  });
}

export async function getSession(): Promise<Session> {
  if (!process.env.CLERK_SECRET_KEY) {
    throw new Error("Clerk is not configured — see platform/README.md → Phase 2 setup.");
  }

  const { userId } = await auth();
  if (!userId) throw new Error("Not signed in.");

  const user = await currentUser();
  const email =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress ??
    `${userId}@clerk.local`;

  // Existing membership? (cross-tenant lookup via the app_user_self policy)
  const existing = await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.clerk_user', ${userId}, true)`);
    const r = await tx.execute(sql`select id, tenant_id, role, worker_id from app_user where clerk_user_id = ${userId} limit 1`);
    return (r.rows as AppUserRow[])[0] ?? null;
  });

  // No membership yet — claim a pending employee invite matching the verified
  // email (via the app_user_invite_* policies) before falling back to a new tenant.
  const claimed = existing ?? (await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.clerk_user', ${userId}, true)`);
    await tx.execute(sql`select set_config('app.clerk_email', ${email}, true)`);
    const r = await tx.execute(sql`select id, tenant_id, role, worker_id from app_user where clerk_user_id is null and lower(email) = lower(${email}) limit 1`);
    const row = (r.rows as AppUserRow[])[0];
    if (!row) return null;
    await tx.execute(sql`update app_user set clerk_user_id = ${userId} where id = ${row.id}`);
    return row;
  }));

  // Existing member or a claimed invite → in. Otherwise only allowlisted emails
  // may start a new company; everyone else is blocked (invite-only).
  const appUser = claimed ?? (canSelfProvision(email) ? await provisionNewTenant(userId, email) : null);
  if (!appUser) throw new NoWorkspaceError();

  let realRole = appUser.role as Role;
  let role = realRole;
  let workerId = appUser.worker_id ?? null;
  const tenantId = appUser.tenant_id;

  // Anyone who manages at least one active report is a manager — even if their
  // app_user role is 'employee' (invited employees default to employee, so a
  // team lead wouldn't otherwise see their reports).
  if (role === "employee" && workerId) {
    const isMgr = await db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.tenant', ${tenantId}, true)`);
      const r = await tx.execute(sql`
        select exists(
          select 1 from (
            select distinct on (worker_id) manager_id, employment_status
            from job_event where effective_date <= current_date
            order by worker_id, effective_date desc, seq desc
          ) cj where cj.manager_id = ${workerId} and cj.employment_status = 'Active'
        ) as m`);
      return (r.rows[0] as { m: boolean }).m;
    });
    if (isMgr) { realRole = "manager"; role = "manager"; }
  }

  if (process.env.NODE_ENV !== "production") {
    // DEV scope testing on the seeded demo tenant — `dev_role` cookie / DEV_ROLE env,
    // worker ids from .dev-session.json.
    const ALLOWED: Role[] = ["owner", "hr_admin", "manager", "employee"];
    const cookieRole = cookies().get("dev_role")?.value as Role | undefined;
    const devRole =
      (cookieRole && ALLOWED.includes(cookieRole) ? cookieRole : undefined) ??
      (process.env.DEV_ROLE as Role | undefined);
    if (devRole && ALLOWED.includes(devRole)) {
      role = devRole;
      try {
        const f = join(process.cwd(), ".dev-session.json");
        if (existsSync(f)) {
          const d = JSON.parse(readFileSync(f, "utf8"));
          if (d.tenantId === tenantId) workerId = d.users?.[role]?.workerId ?? null;
        }
      } catch { /* ignore */ }
      const chosen = cookies().get("view_as_worker")?.value;
      if (chosen && (await validWorker(tenantId, chosen))) workerId = chosen;
    }
  } else if (realRole === "owner") {
    // PRODUCTION: an Owner may "view as" a lower role to preview the app. Downgrade
    // only, and enforced here — a non-owner's cookie has no effect.
    const viewAs = cookies().get("dev_role")?.value as Role | undefined;
    if (viewAs && (["hr_admin", "manager", "employee"] as Role[]).includes(viewAs)) {
      role = viewAs;
      const chosen = cookies().get("view_as_worker")?.value;
      workerId = (chosen && (await validWorker(tenantId, chosen))) ? chosen : await pickSampleWorker(tenantId, viewAs);
    }
  }

  return { tenantId, userId: appUser.id, role, realRole, workerId };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Confirm a chosen "view as" worker id actually belongs to this tenant. */
async function validWorker(tenantId: string, id: string): Promise<boolean> {
  if (!UUID_RE.test(id)) return false;
  try {
    return await db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.tenant', ${tenantId}, true)`);
      const r = await tx.execute(sql`select 1 from worker where id = ${id} limit 1`);
      return r.rows.length > 0;
    });
  } catch { return false; }
}

/** For an Owner previewing as manager/employee in production, pick a representative
 *  worker so the team/self scope shows real data. */
async function pickSampleWorker(tenantId: string, role: Role): Promise<string | null> {
  if (role === "hr_admin") return null; // org scope — no worker needed
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.tenant', ${tenantId}, true)`);
    const q = role === "manager"
      ? sql`select manager_id as id from job_event where manager_id is not null limit 1`
      : sql`select id from worker limit 1`;
    const r = await tx.execute(q);
    return ((r.rows as Array<{ id: string }>)[0]?.id) ?? null;
  });
}
