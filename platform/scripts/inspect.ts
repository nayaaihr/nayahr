// Read-only diagnostic. Pass the connection string explicitly (no .env loading,
// so there's no ambiguity about which DB you hit):
//   npx tsx scripts/inspect.ts "postgresql://OWNER:PWD@HOST/DB?sslmode=require"
// or:  DATABASE_URL="..." npx tsx scripts/inspect.ts
import { Pool } from "pg";

async function main() {
  const url = process.argv[2] || process.env.DATABASE_URL;
  if (!url) throw new Error("Pass a connection string as the first argument, or set DATABASE_URL.");
  const host = (() => { try { return new URL(url).host; } catch { return "?"; } })();
  const pool = new Pool({ connectionString: url });

  // ── WHICH database did we actually connect to? ─────────────────────────────
  const id = (await pool.query(`select current_database() db, current_user usr,
    (select rolbypassrls from pg_roles where rolname = current_user) bypass`)).rows[0];
  console.log("\n=== CONNECTION ===");
  console.log(`host=${host}`);
  console.log(`database=${id.db}  role=${id.usr}  BYPASSRLS=${id.bypass}`);
  if (!id.bypass) console.log("⚠️  This role does NOT bypass RLS — empty results below may just be RLS, not an empty DB. Use the OWNER url for inspection.");

  // ── Migration fingerprint (which features' schema is present?) ─────────────
  const hasCol = async (t: string, c: string) =>
    (await pool.query(`select 1 from information_schema.columns where table_name=$1 and column_name=$2`, [t, c])).rowCount! > 0;
  const hasTbl = async (t: string) => (await pool.query(`select to_regclass($1) r`, [`public.${t}`])).rows[0].r !== null;
  console.log("\n=== MIGRATION LEVEL ===");
  console.log(`requisition.description (0010): ${await hasCol("requisition", "description")}`);
  console.log(`tenant.logo_url (0011):         ${await hasCol("tenant", "logo_url")}`);
  console.log(`job_change_request (0012):      ${await hasTbl("job_change_request")}`);
  console.log(`goal.stage (0013):              ${await hasCol("goal", "stage")}`);

  console.log("\n=== TENANTS ===");
  const tenants = (await pool.query(`select t.name, t.id,
      (select count(*) from worker w where w.tenant_id=t.id) workers,
      (select count(*) from app_user u where u.tenant_id=t.id) users
    from tenant t order by t.created_at`)).rows;
  if (!tenants.length) console.log("(none)");
  tenants.forEach((t) => console.log(`• ${t.name} [${String(t.id).slice(0, 8)}] workers=${t.workers} logins=${t.users}`));

  console.log("\n=== LOGINS ===");
  const users = (await pool.query(`select u.email, u.role, u.clerk_user_id is not null linked, u.worker_id is not null has_worker, t.name tenant
    from app_user u join tenant t on t.id=u.tenant_id order by t.name, u.role`)).rows;
  if (!users.length) console.log("(none)");
  users.forEach((u) => console.log(`• ${u.email} | role=${u.role} | company=${u.tenant} | ${u.linked ? "ACTIVE" : "PENDING invite"} | ${u.has_worker ? "has worker" : "no worker"}`));

  console.log("\n=== EMPLOYEES (manager + login) ===");
  const workers = (await pool.query(`select w.full_name, w.email, t.name tenant,
      (select mw.full_name from job_event j join worker mw on mw.id=j.manager_id where j.worker_id=w.id order by j.effective_date desc, j.seq desc limit 1) manager,
      exists(select 1 from app_user u where u.worker_id=w.id and u.clerk_user_id is not null) has_login
    from worker w join tenant t on t.id=w.tenant_id order by t.name, w.full_name`)).rows;
  if (!workers.length) console.log("(none)");
  workers.forEach((w) => console.log(`• ${w.full_name} (${w.email ?? "no email"}) | company=${w.tenant} | manager=${w.manager ?? "—"} | ${w.has_login ? "has login" : "no login"}`));

  if (await hasCol("goal", "stage")) {
    console.log("\n=== GOALS (stage) ===");
    const goals = (await pool.query(`select w.full_name owner, g.title, g.stage, t.name tenant
      from goal g join worker w on w.id=g.worker_id join tenant t on t.id=g.tenant_id order by t.name, w.full_name`)).rows;
    if (!goals.length) console.log("(none)");
    goals.forEach((g) => console.log(`• ${g.owner} [${g.tenant}] "${g.title}" → stage=${g.stage}`));
  }

  console.log("");
  await pool.end();
}
main().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
