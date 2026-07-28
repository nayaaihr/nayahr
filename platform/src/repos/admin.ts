import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { isSuperAdmin } from "@/lib/superadmin";

export type TenantSummary = {
  id: string; name: string; country: string; created_at: string; name_confirmed: boolean;
  workers: number; users: number; active_users: number; owners: string | null;
};

/** Cross-tenant summary for the provider super-admin console. Super-admin only.
 *  Reads via the SECURITY DEFINER `admin_tenant_summary()` (the app role itself
 *  cannot bypass RLS). Returns null if the function/migration isn't present yet. */
export async function listAllTenants(): Promise<TenantSummary[] | null> {
  if (!(await isSuperAdmin())) throw new Error("Not authorized.");
  try {
    const r = (await db.execute(sql`select * from admin_tenant_summary()`)).rows as Array<Record<string, unknown>>;
    return r.map((x) => ({
      id: x.id as string,
      name: x.name as string,
      country: x.country as string,
      created_at: String(x.created_at),
      name_confirmed: !!x.name_confirmed,
      workers: Number(x.workers ?? 0),
      users: Number(x.users ?? 0),
      active_users: Number(x.active_users ?? 0),
      owners: (x.owners as string) ?? null,
    }));
  } catch {
    return null; // migration 0022 not applied yet
  }
}
