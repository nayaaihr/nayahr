// Delete ORPHAN tenants — ones with zero employees (e.g. stray self-serve
// sign-ups). A tenant with any worker is always kept.
//
// Runs as the DB owner (DATABASE_URL), so pass the PROD owner url inline:
//   DATABASE_URL='<prod owner url>' npm run db:cleanup            # dry run (report only)
//   DATABASE_URL='<prod owner url>' npm run db:cleanup -- --delete  # actually delete
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

async function main() {
  const doDelete = process.argv.includes("--delete");
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const { rows: orphans } = await pool.query(
    `select t.id, t.name, t.created_at,
       (select count(*) from app_user u where u.tenant_id = t.id) as users
     from tenant t
     where not exists (select 1 from worker w where w.tenant_id = t.id)
     order by t.created_at`
  );

  console.log(`\nOrphan tenants (0 employees): ${orphans.length}`);
  for (const o of orphans) {
    console.log(`  ${o.id}  ${JSON.stringify(o.name)}  logins=${o.users}  created ${new Date(o.created_at).toISOString().slice(0, 10)}`);
  }

  if (!doDelete) {
    console.log(`\nDRY RUN — nothing deleted. Review the list above, then re-run with:  -- --delete`);
    await pool.end();
    return;
  }
  if (orphans.length === 0) { await pool.end(); return; }

  for (const o of orphans) {
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
