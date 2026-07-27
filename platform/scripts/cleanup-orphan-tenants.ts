// Delete tenants — two modes, both dry-run by default (add --delete to execute):
//
//   Orphan sweep (default): removes tenants with ZERO employees (stray sign-ups).
//     DATABASE_URL='<owner>' npm run db:cleanup            # dry run
//     DATABASE_URL='<owner>' npm run db:cleanup -- --delete
//
//   Targeted delete: removes ONE specific tenant by id, even if it has employees.
//     DATABASE_URL='<owner>' npm run db:cleanup -- --tenant <uuid>            # dry run
//     DATABASE_URL='<owner>' npm run db:cleanup -- --tenant <uuid> --delete
//
// Runs as the DB owner (DATABASE_URL). Each delete is a single transaction.
import { config } from "dotenv";
import { Pool } from "pg";

config({ path: ".env" });
config({ path: ".env.local", override: true });

// All tenant-scoped tables, children before parents (FK-safe). tenant is last.
const TABLES = [
  "payslip", "payroll_run", "candidate", "requisition", "job_event", "compensation_event",
  "comp_change_request", "leave_request", "job_change_request", "review", "goal",
  "audit_log", "worker", "department", "location", "app_user",
];

type Row = { id: string; name: string; created_at: string; users: number; workers: number };

async function main() {
  const argv = process.argv.slice(2);
  const doDelete = argv.includes("--delete");
  const tIdx = argv.indexOf("--tenant");
  const targetId = tIdx >= 0 ? argv[tIdx + 1] : null;
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  let victims: Row[];
  if (targetId) {
    if (!/^[0-9a-f-]{36}$/i.test(targetId)) { await pool.end(); throw new Error(`--tenant expects a UUID, got: ${targetId}`); }
    const { rows } = await pool.query<Row>(
      `select t.id, t.name, t.created_at,
         (select count(*)::int from app_user u where u.tenant_id = t.id) as users,
         (select count(*)::int from worker w where w.tenant_id = t.id) as workers
       from tenant t where t.id = $1`, [targetId]);
    if (!rows.length) { await pool.end(); throw new Error(`No tenant with id ${targetId}`); }
    victims = rows;
    console.log(`\nTargeted delete — 1 tenant (employees will be removed too):`);
  } else {
    const { rows } = await pool.query<Row>(
      `select t.id, t.name, t.created_at,
         (select count(*)::int from app_user u where u.tenant_id = t.id) as users,
         0 as workers
       from tenant t
       where not exists (select 1 from worker w where w.tenant_id = t.id)
       order by t.created_at`);
    victims = rows;
    console.log(`\nOrphan tenants (0 employees): ${victims.length}`);
  }

  for (const o of victims) {
    console.log(`  ${o.id}  ${JSON.stringify(o.name)}  employees=${o.workers}  logins=${o.users}  created ${new Date(o.created_at).toISOString().slice(0, 10)}`);
  }

  if (!doDelete) {
    console.log(`\nDRY RUN — nothing deleted. Re-run with --delete to remove ${targetId ? "this tenant" : "these"}.`);
    await pool.end();
    return;
  }
  if (victims.length === 0) { await pool.end(); return; }

  for (const o of victims) {
    const c = await pool.connect();
    try {
      await c.query("begin");
      for (const t of TABLES) {
        const reg = (await c.query(`select to_regclass($1) as r`, [`public.${t}`])).rows[0].r;
        if (reg) await c.query(`delete from ${t} where tenant_id = $1`, [o.id]);
      }
      await c.query(`delete from tenant where id = $1`, [o.id]);
      await c.query("commit");
      console.log(`  ✓ deleted ${o.id} (${JSON.stringify(o.name)})`);
    } catch (e) {
      await c.query("rollback");
      console.error(`  ✗ FAILED ${o.id}:`, e instanceof Error ? e.message : e);
    } finally {
      c.release();
    }
  }
  console.log(`\nDone.`);
  await pool.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
