// Delete a specific payroll run (even a Finalized one) + its payslips. For
// cleanup / re-runs. Lists all runs so you can identify the right id; dry-run by
// default. Runs as the DB owner (DATABASE_URL).
//
//   DATABASE_URL='<owner>' npm run payroll:delete-run                         # list runs
//   DATABASE_URL='<owner>' npm run payroll:delete-run -- --id <run-uuid>            # dry run
//   DATABASE_URL='<owner>' npm run payroll:delete-run -- --id <run-uuid> --delete   # delete
import { config } from "dotenv";
import { Pool } from "pg";

config({ path: ".env" });
config({ path: ".env.local", override: true });

const inr = (n: unknown) => "₹" + Math.round(Number(n ?? 0)).toLocaleString("en-IN");

async function main() {
  const argv = process.argv.slice(2);
  const doDelete = argv.includes("--delete");
  const idIdx = argv.indexOf("--id");
  const id = idIdx >= 0 ? argv[idIdx + 1] : null;
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set (owner role).");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  // Always list every run (owner bypasses RLS) so the right id is obvious.
  const runs = (await pool.query(
    `select r.id, t.name as tenant, to_char(r.period,'YYYY-MM') as period, r.status,
            (select count(*)::int from payslip p where p.run_id = r.id) as slips,
            (select coalesce(sum(p.net),0) from payslip p where p.run_id = r.id) as net
     from payroll_run r left join tenant t on t.id = r.tenant_id
     order by r.period desc, t.name`)).rows;

  console.log(`\nPayroll runs: ${runs.length}`);
  for (const r of runs) {
    console.log(`  ${r.id}  ${r.period}  ${String(r.status).padEnd(9)}  ${JSON.stringify(r.tenant)}  slips=${r.slips}  net=${inr(r.net)}`);
  }

  if (!id) {
    console.log(`\nPass --id <run-uuid> to target one (dry run), then add --delete to remove it.`);
    await pool.end();
    return;
  }
  const target = runs.find((r) => r.id === id);
  if (!target) { await pool.end(); throw new Error(`No payroll run with id ${id}`); }

  console.log(`\nTarget: ${target.period} (${target.status}) for ${JSON.stringify(target.tenant)} — ${target.slips} payslips, net ${inr(target.net)}`);
  if (!doDelete) { console.log(`DRY RUN — nothing deleted. Re-run with --delete to remove it.`); await pool.end(); return; }

  const c = await pool.connect();
  try {
    await c.query("begin");
    await c.query(`delete from payslip where run_id = $1`, [id]);
    await c.query(`delete from payroll_run where id = $1`, [id]);
    await c.query("commit");
    console.log(`✓ Deleted payroll run ${id}. You can now re-run ${target.period} from the app.`);
  } catch (e) {
    await c.query("rollback");
    throw e;
  } finally {
    c.release();
  }
  await pool.end();
}
main().catch((e) => { console.error("Error:", e instanceof Error ? e.message : e); process.exit(1); });
