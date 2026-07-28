// Read-only diagnostic for a single sign-in email: shows their app_user
// membership(s), the linked worker, and whether that worker has the events the
// app expects (job_event / compensation_event). Helps explain login/render
// issues for an invited person.
//
//   cd platform && DATABASE_URL='<PROD owner url>' npm run inspect:user -- sharmapratibha.ps@gmail.com
import { config } from "dotenv";
import { Pool } from "pg";

config({ path: ".env" });
config({ path: ".env.local", override: true });

async function main() {
  const email = (process.argv[2] ?? "").trim().toLowerCase();
  if (!email) throw new Error("Usage: npm run inspect:user -- <email>");
  if (!process.env.DATABASE_URL) throw new Error("Set DATABASE_URL (owner role).");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const users = (await pool.query(
    `select u.id, u.tenant_id, t.name as tenant, u.role, u.worker_id,
            (u.clerk_user_id is not null) as claimed
     from app_user u left join tenant t on t.id = u.tenant_id
     where lower(u.email) = lower($1)`, [email])).rows;

  console.log(`\napp_user records for ${email}: ${users.length}`);
  for (const u of users) {
    console.log(`  role=${u.role}  claimed=${u.claimed}  worker_id=${u.worker_id ?? "(none)"}  tenant=${JSON.stringify(u.tenant)} [${u.tenant_id}]`);
    if (u.worker_id) {
      const w = (await pool.query(`select full_name, email, hired_on from worker where id = $1`, [u.worker_id])).rows[0];
      const je = (await pool.query(`select count(*)::int n from job_event where worker_id = $1`, [u.worker_id])).rows[0].n;
      const ce = (await pool.query(`select count(*)::int n from compensation_event where worker_id = $1`, [u.worker_id])).rows[0].n;
      if (!w) console.log(`    ⚠ worker_id points to a MISSING worker row!`);
      else console.log(`    worker: ${JSON.stringify(w.full_name)}  hired_on=${w.hired_on ? String(w.hired_on).slice(0,10) : "(null)"}  job_events=${je}  comp_events=${ce}${je === 0 ? "  ⚠ no job_event → excluded from People/profile" : ""}`);
    } else {
      console.log(`    (no linked worker — an employee with worker_id=null will render an empty People page)`);
    }
  }
  if (users.length === 0) console.log("  (no membership — they'd hit the 'You need an invitation' screen, not a crash)");

  await pool.end();
}
main().catch((e) => { console.error("Error:", e instanceof Error ? e.message : e); process.exit(1); });
