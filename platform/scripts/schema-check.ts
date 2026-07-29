// Read-only schema probe: reports whether the key objects from recent migrations
// exist in the target database. Run it against Dev and against Prod and compare
// to see drift. Safe (SELECTs against catalogs only).
//
//   DATABASE_URL='<dev or prod url>' npm run schema:check
//
// Any role that can read the catalogs works (owner or app role).
import { config } from "dotenv";
import { Pool } from "pg";

config({ path: ".env" });
config({ path: ".env.local", override: true });

function redactHost(url: string): string {
  try { const u = new URL(url); return `${u.host}${u.pathname}`; } catch { return "(database)"; }
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("Set DATABASE_URL to the database you want to check.");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const has = async (q: string, params: unknown[]) => ((await pool.query(q, params)).rowCount ?? 0) > 0;
  const col = (t: string, c: string) => has(`select 1 from information_schema.columns where table_schema='public' and table_name=$1 and column_name=$2`, [t, c]);
  const tbl = (t: string) => has(`select 1 from information_schema.tables where table_schema='public' and table_name=$1`, [t]);
  const fn = (n: string) => has(`select 1 from pg_proc where proname=$1`, [n]);
  const role = (r: string) => has(`select 1 from pg_roles where rolname=$1`, [r]);

  const checks: Array<{ v: string; label: string; ok: () => Promise<boolean> }> = [
    { v: "0015", label: "nayahr_app role (RLS app role)", ok: () => role("nayahr_app") },
    { v: "0016", label: "payroll_run + payslip tables", ok: async () => (await tbl("payroll_run")) && (await tbl("payslip")) },
    { v: "0017", label: "candidate.offer_amount", ok: () => col("candidate", "offer_amount") },
    { v: "0018", label: "payslip.paid_days", ok: () => col("payslip", "paid_days") },
    { v: "0019", label: "worker bank_account / bank_ifsc / pan / uan", ok: () => col("worker", "bank_account") },
    { v: "0020", label: "worker.upi_id", ok: () => col("worker", "upi_id") },
    { v: "0021", label: "tenant.name_confirmed", ok: () => col("tenant", "name_confirmed") },
    { v: "0022", label: "admin_tenant_summary() function", ok: () => fn("admin_tenant_summary") },
    { v: "ledger", label: "schema_migrations ledger table", ok: () => tbl("schema_migrations") },
  ];

  console.log(`\nSchema check — ${redactHost(process.env.DATABASE_URL)}\n${"─".repeat(56)}`);
  let missing = 0;
  for (const c of checks) {
    const ok = await c.ok();
    if (!ok) missing++;
    console.log(`  ${ok ? "✓        " : "✗ MISSING"}  ${c.v.padEnd(7)} ${c.label}`);
  }

  if (await tbl("schema_migrations")) {
    const r = await pool.query<{ version: string }>(`select version from schema_migrations order by version`);
    console.log(`\n  Ledger records ${r.rowCount} migration(s): ${r.rows.map((x) => x.version).join(", ") || "(none)"}`);
  } else {
    console.log(`\n  Ledger not initialised yet — run 'npm run db:apply -- --baseline' (if these are all applied) or apply a migration.`);
  }

  console.log(`${"─".repeat(56)}`);
  console.log(missing === 0 ? "✓ All checked objects present.\n" : `✗ ${missing} object(s) missing — apply the corresponding migration(s).\n`);
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
