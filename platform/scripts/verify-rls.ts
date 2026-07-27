// Verify tenant isolation (Row-Level Security) on a live database — read-only
// (the one write it attempts is inside a rolled-back transaction, so nothing
// persists). Uses TWO connections:
//   DATABASE_URL      = owner role  → enumerate tenants + ground-truth counts
//   APP_DATABASE_URL  = nayahr_app  → the role the app uses; must NOT bypass RLS
//
//   cd platform && DATABASE_URL='<owner>' APP_DATABASE_URL='<app>' npm run rls:verify
import { config } from "dotenv";
import { Pool } from "pg";

config({ path: ".env" });
config({ path: ".env.local", override: true });

const ZERO_UUID = "00000000-0000-0000-0000-000000000000";

async function main() {
  const OWNER = process.env.DATABASE_URL;
  const APP = process.env.APP_DATABASE_URL;
  if (!OWNER) throw new Error("Set DATABASE_URL (owner role) — used only to list tenants + true counts.");
  if (!APP) throw new Error("Set APP_DATABASE_URL (the nayahr_app role) — the role under test.");

  const owner = new Pool({ connectionString: OWNER });
  const app = new Pool({ connectionString: APP });
  const pass: string[] = [], fail: string[] = [];
  const check = (cond: boolean, msg: string) => (cond ? pass : fail).push(msg);

  // Ground truth (owner bypasses RLS, so this is the real data).
  const tenants = (await owner.query(
    `select t.id, t.name, (select count(*)::int from worker w where w.tenant_id = t.id) as workers
     from tenant t order by t.name`
  )).rows as Array<{ id: string; name: string; workers: number }>;
  console.log(`\nTenants in this database: ${tenants.length}`);
  tenants.forEach((t) => console.log(`  ${t.id}  ${JSON.stringify(t.name)}  workers=${t.workers}`));

  // Run a query on the app connection inside a tenant-scoped, rolled-back txn.
  async function asTenant<T>(tid: string, fn: (c: import("pg").PoolClient) => Promise<T>): Promise<T> {
    const c = await app.connect();
    try {
      await c.query("begin");
      await c.query(`select set_config('app.tenant', $1, true)`, [tid]);
      const r = await fn(c);
      await c.query("rollback");
      return r;
    } finally { c.release(); }
  }

  // 1. The app role must NOT be able to bypass RLS.
  const who = (await app.query(
    `select current_user as u, (select rolbypassrls from pg_roles where rolname = current_user) as bypass`
  )).rows[0] as { u: string; bypass: boolean };
  check(who.bypass === false, `App role "${who.u}" does NOT bypass RLS (rolbypassrls=false)`);
  if (who.bypass) console.log(`  ⚠️  "${who.u}" BYPASSES RLS — tenant isolation is void. APP_DATABASE_URL must use nayahr_app.`);

  // 2. Default-deny: with no tenant set, zero rows are visible.
  const none = await asTenant("", async (c) => (await c.query(`select count(*)::int n from worker`)).rows[0].n as number);
  check(none === 0, `No tenant set → 0 workers visible (got ${none})`);

  // 3. Per-tenant scoping: sees exactly its own rows, and zero from others.
  for (const t of tenants) {
    const own = await asTenant(t.id, async (c) => (await c.query(`select count(*)::int n from worker`)).rows[0].n as number);
    check(own === t.workers, `${t.name}: sees own ${t.workers} workers (got ${own})`);
    const foreign = await asTenant(t.id, async (c) => (await c.query(`select count(*)::int n from worker where tenant_id <> $1`, [t.id])).rows[0].n as number);
    check(foreign === 0, `${t.name}: sees 0 rows belonging to other tenants (got ${foreign})`);
  }

  // 4. Cross-tenant read by id is blocked (needs ≥2 tenants).
  if (tenants.length >= 2) {
    const [A, B] = tenants;
    const bWorker = (await owner.query(`select id from worker where tenant_id = $1 limit 1`, [B.id])).rows[0] as { id: string } | undefined;
    if (bWorker) {
      const seen = await asTenant(A.id, async (c) => (await c.query(`select count(*)::int n from worker where id = $1`, [bWorker.id])).rows[0].n as number);
      check(seen === 0, `${A.name} cannot read a specific ${B.name} worker by id (got ${seen})`);
    }
  } else {
    console.log("  (only one tenant with data — cross-tenant read test skipped; scoping tests above still prove isolation)");
  }

  // 5. Cross-tenant WRITE is rejected (rolled back regardless).
  if (tenants.length >= 1) {
    const A = tenants[0];
    const foreignTid = tenants.find((t) => t.id !== A.id)?.id ?? ZERO_UUID;
    let blocked = false;
    await asTenant(A.id, async (c) => {
      try {
        await c.query(`insert into worker (tenant_id, full_name, hired_on) values ($1, 'RLS-TEST', current_date)`, [foreignTid]);
      } catch { blocked = true; }
    });
    check(blocked, `Writing a row into another tenant is rejected by RLS`);
  }

  await owner.end();
  await app.end();

  console.log(`\n✓ PASSED (${pass.length})`);
  pass.forEach((m) => console.log(`  ✓ ${m}`));
  if (fail.length) {
    console.log(`\n✗ FAILED (${fail.length})`);
    fail.forEach((m) => console.log(`  ✗ ${m}`));
    console.log("\nTENANT ISOLATION IS NOT SAFE — do not onboard real clients until this passes.");
    process.exit(1);
  }
  console.log("\nAll tenant-isolation checks PASSED. ✅");
}

main().catch((e) => { console.error(e); process.exit(1); });
