// Operator view: list every client tenant (environment) with its company name,
// owner, employee count and sign-in activity — so you can tell clients apart.
// Read-only. Run as the owner role:
//
//   cd platform && DATABASE_URL='<PROD owner url>' npm run clients:list
import { config } from "dotenv";
import { Pool } from "pg";

config({ path: ".env" });
config({ path: ".env.local", override: true });

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("Set DATABASE_URL (owner role).");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  // name_confirmed may not exist pre-migration → coalesce via a to_jsonb probe.
  const hasFlag = ((await pool.query(
    `select 1 from information_schema.columns where table_name='tenant' and column_name='name_confirmed'`,
  )).rowCount ?? 0) > 0;

  const rows = (await pool.query(`
    select t.id, t.name, t.country, t.created_at,
      ${hasFlag ? "t.name_confirmed" : "true as name_confirmed"},
      (select count(*) from worker w where w.tenant_id = t.id)::int as workers,
      (select count(*) from app_user u where u.tenant_id = t.id)::int as users,
      (select count(*) from app_user u where u.tenant_id = t.id and u.clerk_user_id is not null)::int as active_users,
      (select string_agg(u.email, ', ' order by u.email) from app_user u where u.tenant_id = t.id and u.role = 'owner') as owners
    from tenant t order by t.created_at asc
  `)).rows;

  console.log(`\nClients / tenants: ${rows.length}\n${"─".repeat(64)}`);
  for (const r of rows) {
    const created = new Date(r.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    const unnamed = r.name_confirmed ? "" : "  ⚠ name not set by client";
    console.log(`\n  ${r.name}${unnamed}`);
    console.log(`    owner:     ${r.owners ?? "—"}`);
    console.log(`    employees: ${r.workers}   ·   users: ${r.active_users}/${r.users} active   ·   ${r.country}   ·   created ${created}`);
    console.log(`    tenant id: ${r.id}`);
  }
  console.log(`\n${"─".repeat(64)}`);

  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
