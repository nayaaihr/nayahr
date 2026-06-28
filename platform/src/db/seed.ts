// Seeds one tenant with ~48 effective-dated workers (parity with the prototype),
// plus reference data, managers, compensation, and three demo app_users.
// Writes platform/.dev-session.json so the app has a session out of the box.
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";
import { Pool, type PoolClient } from "pg";

config({ path: ".env" });
config({ path: ".env.local", override: true });

const DEPTS = ["Engineering", "Sales", "Marketing", "Operations", "Finance", "HR", "Customer Success"];
const LOCS = ["Bengaluru", "Mumbai", "Remote", "Pune", "Delhi"];
const TITLES: Record<string, string[]> = {
  Engineering: ["Software Engineer", "Senior Engineer", "Engineering Manager", "QA Analyst"],
  Sales: ["Account Executive", "Sales Manager", "SDR", "Regional Head"],
  Marketing: ["Marketing Associate", "Content Lead", "Growth Manager"],
  Operations: ["Ops Associate", "Ops Manager"],
  Finance: ["Accountant", "Finance Manager", "Payroll Specialist"],
  HR: ["HR Generalist", "Recruiter", "HR Manager"],
  "Customer Success": ["CSM", "Support Lead", "Onboarding Specialist"],
};
const FIRST = ["Aarav", "Diya", "Vihaan", "Ananya", "Arjun", "Saanvi", "Reyansh", "Aadhya", "Kabir", "Ishaan", "Myra", "Vivaan", "Anika", "Aditya", "Pari", "Krishna", "Riya", "Dhruv", "Sara", "Aryan", "Meera", "Rohan", "Tara", "Karan", "Neha", "Sameer", "Pooja", "Nikhil", "Sneha", "Varun"];
const LAST = ["Sharma", "Patel", "Reddy", "Nair", "Iyer", "Gupta", "Mehta", "Verma", "Singh", "Rao", "Joshi", "Kapoor", "Malhotra", "Bose", "Das", "Khanna"];

const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set (.env)");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const c = await pool.connect();
  try {
    await c.query("begin");

    // Create the tenant id up-front and set the GUC so FORCE-RLS write-checks pass.
    const tenantId = (await c.query("select gen_random_uuid() as id")).rows[0].id as string;
    await c.query("select set_config('app.tenant', $1, true)", [tenantId]);
    await c.query("insert into tenant (id, name, country) values ($1, $2, 'IN')", [tenantId, "Acme India Pvt Ltd"]);

    // reference data
    const deptId: Record<string, string> = {};
    for (const d of DEPTS) {
      const r = await c.query("insert into department (tenant_id, name) values ($1,$2) returning id", [tenantId, d]);
      deptId[d] = r.rows[0].id;
    }
    const locId: Record<string, string> = {};
    for (const l of LOCS) {
      const r = await c.query("insert into location (tenant_id, name) values ($1,$2) returning id", [tenantId, l]);
      locId[l] = r.rows[0].id;
    }

    type W = { id: string; name: string; dept: string; title: string; active: boolean; hireDays: number };
    const workers: W[] = [];

    for (let i = 0; i < 48; i++) {
      const dept = pick(DEPTS);
      const name = `${pick(FIRST)} ${pick(LAST)}`;
      const title = pick(TITLES[dept]);
      const hireDays = 30 + Math.floor(Math.random() * 1500);
      const hire = daysAgo(hireDays);
      const baseSal = 400000 + Math.floor(Math.random() * 40) * 50000;
      const active = Math.random() > 0.13;
      const email = name.toLowerCase().replace(/ /g, ".") + "@acme.example";

      const wr = await c.query(
        "insert into worker (tenant_id, full_name, email, hired_on) values ($1,$2,$3,$4) returning id",
        [tenantId, name, email, hire],
      );
      const wid = wr.rows[0].id as string;
      workers.push({ id: wid, name, dept, title, active, hireDays });

      // Hire event (manager set in a second pass) + base comp
      await c.query(
        `insert into job_event (tenant_id, worker_id, effective_date, seq, event_type, title, department_id, location_id, employment_status)
         values ($1,$2,$3,0,'Hire',$4,$5,$6,'Active')`,
        [tenantId, wid, hire, title, deptId[dept], locId[pick(LOCS)]],
      );
      await c.query(
        `insert into compensation_event (tenant_id, worker_id, effective_date, seq, amount, currency)
         values ($1,$2,$3,0,$4,'INR')`,
        [tenantId, wid, hire, baseSal],
      );

      // Optional annual increment (effective-dated comp change)
      if (hireDays > 400 && Math.random() > 0.4) {
        const d = daysAgo(hireDays - 365);
        await c.query(
          `insert into compensation_event (tenant_id, worker_id, effective_date, seq, amount, currency)
           values ($1,$2,$3,1,$4,'INR')`,
          [tenantId, wid, d, Math.round(baseSal * 1.08)],
        );
      }

      // Termination (effective-dated job event)
      if (!active) {
        const td = daysAgo(Math.floor(Math.random() * hireDays * 0.6));
        await c.query(
          `insert into job_event (tenant_id, worker_id, effective_date, seq, event_type, title, department_id, employment_status)
           values ($1,$2,$3,1,'Terminate',$4,$5,'Terminated')`,
          [tenantId, wid, td, title, deptId[dept]],
        );
      }
    }

    // Assign managers within each department (a Manager/Head/Lead, else first)
    const managerByDept: Record<string, string | undefined> = {};
    for (const d of DEPTS) {
      const inDept = workers.filter((w) => w.dept === d && w.active);
      const mgr = inDept.find((w) => /Manager|Head|Lead/.test(w.title)) ?? inDept[0];
      managerByDept[d] = mgr?.id;
      for (const w of inDept) {
        if (mgr && w.id !== mgr.id) {
          await c.query(
            "update job_event set manager_id = $1 where worker_id = $2 and event_type = 'Hire'",
            [mgr.id, w.id],
          );
        }
      }
    }

    // Three demo users (Clerk replaces this later)
    const hrUser = (await c.query(
      "insert into app_user (tenant_id, email, role) values ($1,$2,'hr_admin') returning id",
      [tenantId, "hr@acme.example"],
    )).rows[0].id;

    const managerWorker = managerByDept["Engineering"] ?? workers.find((w) => w.active)!.id;
    const mgrUser = (await c.query(
      "insert into app_user (tenant_id, email, role, worker_id) values ($1,$2,'manager',$3) returning id",
      [tenantId, "manager@acme.example", managerWorker],
    )).rows[0].id;

    const empWorker = workers.find((w) => w.active && w.id !== managerWorker)!.id;
    const empUser = (await c.query(
      "insert into app_user (tenant_id, email, role, worker_id) values ($1,$2,'employee',$3) returning id",
      [tenantId, "employee@acme.example", empWorker],
    )).rows[0].id;

    await c.query("commit");

    const devSession = {
      tenantId,
      users: {
        hr_admin: { userId: hrUser, workerId: null },
        manager: { userId: mgrUser, workerId: managerWorker },
        employee: { userId: empUser, workerId: empWorker },
      },
    };
    writeFileSync(join(process.cwd(), ".dev-session.json"), JSON.stringify(devSession, null, 2));

    console.log(`Seeded tenant ${tenantId} with ${workers.length} workers.`);
    console.log("Wrote .dev-session.json (hr_admin / manager / employee). Switch persona with DEV_ROLE.");
  } catch (e) {
    await c.query("rollback");
    throw e;
  } finally {
    c.release();
    await pool.end();
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
