import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";

// One shared pool, reused across warm serverless invocations. The app connects
// as the DB role for which RLS is FORCE-enabled, so isolation is enforced
// regardless of role once app.tenant is set.
//
// Serverless note: keep `max` small (each function instance handles ~1 request
// at a time) and point DATABASE_URL at a connection-pooled endpoint in
// production (e.g. Neon's `-pooler` host, PgBouncer transaction mode — which is
// compatible with our transaction-scoped `set_config`).
// The APP must connect as a role that does NOT bypass RLS (Neon's default
// `neondb_owner` has BYPASSRLS, which silently disables tenant isolation). Use
// APP_DATABASE_URL (the dedicated `nayahr_app` role) for the app; migrations keep
// using DATABASE_URL (the owner role). Falls back to DATABASE_URL if unset.
const globalForPool = globalThis as unknown as { _nayahrPool?: Pool };
export const pool =
  globalForPool._nayahrPool ??
  new Pool({
    connectionString: process.env.APP_DATABASE_URL ?? process.env.DATABASE_URL,
    max: Number(process.env.PG_POOL_MAX ?? 5),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
globalForPool._nayahrPool = pool;

export const db = drizzle(pool);

export type Role = "owner" | "hr_admin" | "manager" | "employee";
export type Session = {
  tenantId: string;
  userId: string | null;
  role: Role;            // effective role (may be a "view as" override)
  realRole: Role;        // the user's true role (Owner can preview lower roles)
  workerId: string | null; // the worker this user IS (for self/team scoping)
};

/**
 * Runs `fn` inside a transaction that has the request's tenant/user/role set as
 * Postgres GUCs (transaction-local). RLS policies read `app.tenant`, so every
 * query inside is automatically scoped to this tenant — the UI and the AI tools
 * both go through here.
 */
export async function withSession<T>(s: Session, fn: (tx: typeof db) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.tenant', ${s.tenantId}, true)`);
    await tx.execute(sql`select set_config('app.user', ${s.userId ?? ""}, true)`);
    await tx.execute(sql`select set_config('app.role', ${s.role}, true)`);
    return fn(tx as unknown as typeof db);
  });
}
